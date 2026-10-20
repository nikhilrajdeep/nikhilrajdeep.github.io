import importlib.util
import pathlib
import unittest
from bs4 import BeautifulSoup

spec = importlib.util.spec_from_file_location('refresh', pathlib.Path(__file__).with_name('refresh-scholar.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def profile(count='7'):
    metrics = ''.join(f'<tr><td class="gsc_rsb_std">{v}</td></tr>' for v in [40, 3, 2])
    return BeautifulSoup(f'<table id="gsc_rsb_st"><tbody>{metrics}</tbody></table>'
        f'<tr class="gsc_a_tr"><td><a class="gsc_a_at" href="/citations?citation_for_view=Tq4KyvUAAAAJ:abc">Paper</a>'
        f'<a class="gsc_a_ac">{count}</a></td></tr>', 'html.parser')

class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.data = {'updated': '2026-01-01', 'items': [dict(id='scholar-abc', title='Paper', citations=5, doi='verified', impact={'value': 3})]}

    def test_updates_counts_preserves_curated_metadata_and_input(self):
        updated, pending = module.refresh(self.data, profile())
        self.assertEqual(updated['items'][0]['citations'], 7)
        self.assertEqual(updated['items'][0]['doi'], 'verified')
        self.assertEqual(self.data['items'][0]['citations'], 5)
        self.assertEqual(updated['scholarTotalCitations'], 40)
        self.assertEqual(pending, [])

    def test_missing_count_is_not_zero(self):
        soup = profile()
        soup.select_one('.gsc_a_ac').decompose()
        with self.assertRaises(ValueError):
            module.refresh(self.data, soup)
        self.assertEqual(self.data['items'][0]['citations'], 5)

    def test_incomplete_or_paginated_snapshot_rejected(self):
        with self.assertRaises(ValueError):
            module.refresh(self.data, BeautifulSoup('captcha', 'html.parser'))
        soup = profile()
        soup.append(soup.new_tag('button', id='gsc_bpf_more'))
        with self.assertRaises(ValueError):
            module.refresh(self.data, soup)

    def test_verified_zero_is_allowed(self):
        updated, _ = module.refresh(self.data, profile(''))
        self.assertEqual(updated['items'][0]['citations'], 0)

if __name__ == '__main__':
    unittest.main()
