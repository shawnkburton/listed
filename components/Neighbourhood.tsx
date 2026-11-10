'use client';
import {useState} from 'react';
import {Sparkles} from 'lucide-react';
import type {Property} from '@/lib/domain';
import {neighbourhoodResearch,researchById,suggestedNeighbourhood,type NeighbourhoodDescription,type NeighbourhoodResearch} from '@/lib/neighbourhood';

function Sources({research}:{research:NeighbourhoodResearch}){
  return <details className="neighbourhood-sources"><summary>Sources · checked {research.checkedAt}</summary><ul>{research.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a><small>{source.supports}</small></li>)}</ul></details>;
}
export function NeighbourhoodEditor({property,onChange}:{property:Property;onChange:(value:NeighbourhoodDescription|undefined)=>void}){
  const saved=property.neighbourhood;
  const suggested=suggestedNeighbourhood(property.address,property.area);
  const [researchId,setResearchId]=useState(saved?.researchId||suggested?.id||'');
  const [draft,setDraft]=useState<string|null>(null),[reviewed,setReviewed]=useState(false);
  const research=researchById(researchId);
  const validText=draft!==null&&draft.trim().length>=30&&draft.trim().length<=2000;
  return <section className="assessment-prefill neighbourhood-agent" aria-label="Seller agent neighbourhood description">
    <span className="eyebrow"><Sparkles size={14}/> SELLER AGENT · FIRST LOOK</span>
    <h4>Tell the story of the neighbourhood.</h4>
    <p>Start with a description drawn from public sources, then make it your own. It appears separately from your home’s description.</p>
    <p className="subtle">Research currently covers Gonzales. This first version uses checked sources; live web research for other neighbourhoods is not connected yet.</p>
    {!property.address.trim()?<p>Enter the street address to get started.</p>:<>
      {saved&&draft===null?<><p className="neighbourhood-copy">{saved.text}</p><p className="success-note" role="status">Added to this form. Save or publish the listing to keep it.</p><div className="workspace-actions"><button type="button" className="secondary" onClick={()=>{setResearchId(saved.researchId);setDraft(saved.text);setReviewed(false);}}>Edit neighbourhood description</button><button type="button" className="text-button" onClick={()=>onChange(undefined)}>Remove description</button></div></>:<>
        <label>Researched neighbourhood<select value={researchId} onChange={e=>{setResearchId(e.target.value);setDraft(null);setReviewed(false);}}><option value="">Choose a neighbourhood</option>{neighbourhoodResearch.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <p className="subtle">{suggested?'Suggested for this address. Please confirm it describes the right area.':'We haven’t matched this address to a researched neighbourhood. Select Gonzales only if it applies to this home.'}</p>
        {draft===null?<button type="button" className="secondary" disabled={!research} onClick={()=>{if(research){setDraft(research.draft);setReviewed(false);}}}><Sparkles size={15}/> Draft neighbourhood description</button>:<>
          <label>Review your neighbourhood description<textarea rows={7} maxLength={2000} value={draft} onChange={e=>{setDraft(e.target.value);setReviewed(false);}}/></label>
          <small className="subtle">{draft.trim().length}/2,000 characters · minimum 30</small>
          <p className="subtle">Park viewpoints describe the park, not views from the home. Check any travel times, school catchments or other details you add.</p>
          <label className="check-row"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/><span>I’ve reviewed the text and confirmed this neighbourhood applies to {property.address}.</span></label>
          <div className="workspace-actions"><button type="button" className="primary" disabled={!reviewed||!validText||!research} onClick={()=>{onChange({researchId,address:property.address.trim(),area:property.area,text:draft.trim(),reviewed:true});setDraft(null);}}>{saved?'Use updated description':'Add to listing'}</button><button type="button" className="text-button" onClick={()=>setDraft(null)}>Discard changes</button></div>
          <p className="subtle" role="status">This draft isn’t included when you save until you choose “{saved?'Use updated description':'Add to listing'}”.</p>
        </>}
      </>}
      {research&&<Sources research={research}/>}
    </>}
  </section>;
}
export function NeighbourhoodDetails({property}:{property:Property}){
  const value=property.neighbourhood,research=value&&researchById(value.researchId);
  if(!value||!research)return null;
  return <section className="property-evidence neighbourhood-agent"><span className="eyebrow">AROUND THE NEIGHBOURHOOD</span><h3>{research.name}</h3><p className="neighbourhood-copy">{value.text}</p><Sources research={research}/><p className="subtle">Seller-reviewed description. Sources informed the starting draft; seller edits are not independently checked. Neighbourhood amenities and views are not features of the home.</p></section>;
}
