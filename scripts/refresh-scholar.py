"""Refresh public Scholar counts without destroying curated CV/publisher metadata."""
import copy
import datetime
import json
import os
import pathlib
import re
import time
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/publications.json'
PROFILE = 'https://scholar.google.com/citations?user=Tq4KyvUAAAAJ&hl=en&pagesize=100'


def fetch(url):
    key = os.environ.get('SERPAPI_KEY')
    if key:
        query = parse_qs(urlparse(url).query)
        params = dict(engine='google_scholar_author', author_id='Tq4KyvUAAAAJ',
                      hl='en', num=100, output='html', api_key=key)
        if query.get('citation_for_view'):
            params.update(view_op='view_citation', citation_id=query['citation_for_view'][0])
        try:
            response = requests.get('https://serpapi.com/search', params=params, timeout=90)
        except requests.RequestException:
            raise RuntimeError('Scholar data service request failed') from None
    else:
        response = requests.get(url, timeout=40, headers={'User-Agent': 'Mozilla/5.0'})
    if not response.ok:
        raise RuntimeError(f'Scholar source returned HTTP {response.status_code}; retaining previous snapshot')
    soup = BeautifulSoup(response.text, 'html.parser')
    if soup.select_one('#captcha-form') or 'unusual traffic' in soup.get_text().lower():
        raise RuntimeError('Scholar blocked this request; retaining the previous snapshot')
    return soup


def refresh(data, soup, detail_fetch=fetch):
    result = copy.deepcopy(data)
    indices = soup.select('#gsc_rsb_st tbody tr')
    rows = soup.select('.gsc_a_tr')
    more = soup.select_one('#gsc_bpf_more')
    if more and not more.has_attr('disabled'):
        raise ValueError('Profile exceeds one page; refusing a partial snapshot')
    if len(indices) < 3 or not rows:
        raise ValueError('Incomplete Scholar response; retaining the previous snapshot')
    for key, row in zip(('scholarTotalCitations', 'scholarHIndex', 'scholarI10Index'), indices):
        cells = row.select('.gsc_rsb_std')
        if not cells or not cells[0].get_text(strip=True).isdigit():
            raise ValueError('Missing Scholar profile metric')
        result[key] = int(cells[0].get_text(strip=True))
    known = {item['id']: item for item in result['items']}
    pending = []
    for row in rows:
        anchor = row.select_one('.gsc_a_at')
        if not anchor:
            raise ValueError('Missing publication identity')
        url = urljoin(PROFILE, anchor['href'])
        identifier = parse_qs(urlparse(url).query).get('citation_for_view', [''])[0].split(':')[-1]
        if not identifier:
            raise ValueError('Invalid Scholar publication ID')
        item = known.get('scholar-' + identifier)
        count = row.select_one('.gsc_a_ac')
        if count is None:
            raise ValueError('Missing citation field; refusing to substitute zero')
        count_text = count.get_text(strip=True)
        if count_text and not count_text.isdigit():
            raise ValueError('Unexpected citation count')
        citations = int(count_text or '0')
        if item:
            item['citations'] = citations
            if count and count.get('href'):
                item['citationUrl'] = urljoin(PROFILE, count['href'])
            continue
        time.sleep(2)
        detail = detail_fetch(url)
        fields = {}
        for field in detail.select('.gs_scl'):
            label, value = field.select_one('.gsc_oci_field'), field.select_one('.gsc_oci_value')
            if label and value:
                fields[label.get_text(strip=True)] = value.get_text(' ', strip=True)
        venue = fields.get('Journal') or fields.get('Conference')
        authors = [name.strip() for name in fields.get('Authors', '').split(',') if name.strip()]
        title = detail.select_one('#gsc_oci_title')
        date = fields.get('Publication date', '')
        # Never infer a publication type for preprints or ambiguous records.
        if not venue or re.search(r'arxiv|preprint|eartharxiv|ssrn', venue, re.I) or not authors or not title or not re.match(r'^\d{4}(?:/\d{1,2})*$', date):
            pending.append({'title': anchor.get_text(strip=True), 'scholarUrl': url})
            continue
        title_text = title.get_text(' ', strip=True)
        normalize = lambda text: re.sub(r'\W+', '', text).lower()
        if any(normalize(x['title']) == normalize(title_text) for x in result['items']):
            pending.append({'title': title_text, 'scholarUrl': url, 'reason': 'Possible existing version'})
            continue
        parts = date.split('/')
        normalized_date = '-'.join([parts[0]] + [part.zfill(2) for part in parts[1:]])
        item = dict(id='scholar-' + identifier, group='published' if fields.get('Journal') else 'conference',
                    title=title_text, authors=authors, year=int(date[:4]), date=normalized_date,
                    venue=venue, citations=citations, scholarUrl=url, source='Google Scholar')
        for field, key in [('Volume', 'volume'), ('Issue', 'issue'), ('Pages', 'pages')]:
            if fields.get(field):
                item[key] = fields[field]
        if count and count.get('href'):
            item['citationUrl'] = urljoin(PROFILE, count['href'])
        result['items'].append(item)
    result['updated'] = datetime.date.today().isoformat()
    return result, pending


if __name__ == '__main__':
    original = json.loads(DATA.read_text(encoding='utf-8'))
    updated, pending = refresh(original, fetch(PROFILE))
    # Only write after the complete snapshot has passed validation.
    DATA.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    pathlib.Path('scholar-review.json').write_text(json.dumps(pending, indent=2) + '\n', encoding='utf-8')
    print(f"Verified {updated['scholarTotalCitations']} citations; {len(pending)} ambiguous records retained for review")
