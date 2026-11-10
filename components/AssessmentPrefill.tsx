'use client';
import {useState} from 'react';
import type {Property} from '@/lib/domain';
import {parseAssessment,applyAssessment,assessmentLabels,type AssessmentField,type AssessmentPreview} from '@/lib/assessment-prefill';
const money=(v:number)=>`$${v.toLocaleString('en-CA')}`;
export default function AssessmentPrefill({draft,onChange}:{draft:Property;onChange:(next:Property)=>void}){
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[url,setUrl]=useState(''),[preview,setPreview]=useState<AssessmentPreview>(),[selected,setSelected]=useState<AssessmentField[]>([]),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 const source=draft.assessmentImport;
 function review(){try{const result=parseAssessment(text,url);setPreview(result);setSelected(Object.keys(result.fields) as AssessmentField[]);setConfirmed(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not read these details.');setPreview(undefined);}}
 function resetReview(){setPreview(undefined);setConfirmed(false);setError('');}
 return <section className="assessment-prefill" aria-label="BC Assessment prefill">
  <div className="assessment-prefill-heading"><div><h4>Start with BC Assessment</h4><p>Import recorded details for your home, then review and edit them.</p></div><button type="button" className="secondary" onClick={()=>setOpen(!open)}>{open?'Close import':'Import assessment details'}</button></div>
  {source&&<p className="success-note" role="status">Assessment details imported for {source.address}. {source.url&&<a href={source.url} target="_blank" rel="noreferrer">View source record ↗</a>}<br/><span className="subtle">Seller-provided reference{source.year?` · ${source.year} assessment`:''}{source.value!==undefined?` · ${money(source.value)}`:''}. Details remain editable.</span></p>}
  {open&&<div className="assessment-review">
   <p>Use this with any BC address that has an assessment record. Automatic address lookup is not connected yet.</p>
   <ol><li><a href="https://www.bcassessment.ca/Property/AssessmentSearch" target="_blank" rel="noreferrer">Open BC Assessment search ↗</a> and find your exact address{draft.address?` (${draft.address})`:''}, including the unit if applicable.</li><li>Copy the property record from its address through the Property information section, then paste it below.</li><li>Review the address and choose which details to apply.</li></ol>
   <label>Assessment record text<textarea rows={6} maxLength={50000} value={text} onChange={e=>{setText(e.target.value);resetReview();}} placeholder="Paste the address, Area-Jurisdiction-Roll, and Property information here…"/></label>
   <label>BC Assessment property link (optional)<input type="url" value={url} onChange={e=>{setUrl(e.target.value);resetReview();}} placeholder="https://www.bcassessment.ca/Property/Info/…"/></label>
   <p className="subtle">The pasted text is read on your device and is not saved. Only reviewed fields and a seller-provided source reference are retained when you save the listing.</p>
   <button type="button" className="secondary" disabled={!text.trim()} onClick={review}>Review assessment details</button>
   {error&&<p className="account-error" role="alert">{error}</p>}
   {preview&&<>
    <h4 className="assessment-record-title">{preview.reference.address}</h4>
    <p className="subtle">{preview.reference.pid?`PID ${preview.reference.pid}`:'PID not found'}{preview.reference.year?` · ${preview.reference.year} assessment`:''}</p>
    {preview.reference.value!==undefined&&<p><strong>Assessed value: {money(preview.reference.value)}</strong><br/><span className="subtle">For reference only. This will not set your asking price.</span></p>}
    <p>Applying these details sets the address to the one above{draft.address?` (currently “${draft.address}”)`:''}. Only checked fields will be replaced.</p>
    <div className="assessment-field-options">{(Object.keys(preview.fields) as AssessmentField[]).map(f=><label className="check-row" key={f}><input type="checkbox" checked={selected.includes(f)} onChange={e=>setSelected(e.target.checked?[...selected,f]:selected.filter(k=>k!==f))}/><span>{assessmentLabels[f]}: <strong>{f==='year'?preview.fields[f]:preview.fields[f]!.toLocaleString('en-CA')}</strong><small>Currently: {draft[f]?(f==='year'?draft[f]:draft[f].toLocaleString('en-CA')):'Not entered'}</small></span></label>)}</div>
    <ul className="subtle">{preview.warnings.map(w=><li key={w}>{w}</li>)}</ul>
    <p className="subtle">Your asking price, floor area, description and photos are kept.</p>
    <label className="check-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>This is the correct property and unit for my listing.</span></label>
    <button type="button" className="primary" disabled={!confirmed||!selected.length} onClick={()=>{onChange(applyAssessment(draft,preview,selected));setOpen(false);setText('');resetReview();}}>Apply reviewed details</button>
   </>}
  </div>}
 </section>;
}
