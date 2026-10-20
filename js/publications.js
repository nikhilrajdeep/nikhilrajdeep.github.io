(function(){
  'use strict';
  const root=document.getElementById('publication');
  if(!root)return;
  const search=document.getElementById('publicationSearch');
  const sort=document.getElementById('publicationSort');
  const groups=Array.from(root.querySelectorAll('.publication-group'));
  const status=document.getElementById('publicationSearchStatus');
  root.querySelector('.publication-controls').hidden=false;
  function update(){
    const term=search.value.trim().toLocaleLowerCase();let matches=0;
    groups.forEach(group=>{
      const list=group.querySelector('.publication-records');
      const records=Array.from(list.children);
      records.sort((a,b)=>(sort.value==='citations'?Number(b.dataset.citations)-Number(a.dataset.citations):0)||b.dataset.date.localeCompare(a.dataset.date)||a.querySelector('h4').textContent.localeCompare(b.querySelector('h4').textContent));
      let visible=0;
      records.forEach(record=>{record.hidden=!!term&&!record.textContent.toLocaleLowerCase().includes(term);if(!record.hidden)visible++;list.appendChild(record);});
      group.hidden=visible===0;
      matches+=visible;
    });
    status.textContent=matches?`${matches} publication${matches===1?'':'s'} shown`:'No publications match your search.';
    status.classList.toggle('sr-only',matches>0);
  }
  search.addEventListener('input',update);sort.addEventListener('change',update);update();
})();
