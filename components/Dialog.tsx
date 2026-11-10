'use client';
import {createContext,useContext,useEffect,useRef} from 'react';
import {X} from 'lucide-react';
const CloseGuard=createContext<React.MutableRefObject<(()=>boolean)|null>|null>(null);
export function useDialogCloseGuard(guard:()=>boolean){const context=useContext(CloseGuard);useEffect(()=>{if(!context)return;context.current=guard;return()=>{context.current=null;};},[context,guard]);}
export default function Dialog({title,children,onClose,wide=false}:{title:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}){
 const guard=useRef<(()=>boolean)|null>(null);
 const requestClose=()=>{if(!guard.current||guard.current())onClose();};
 const ref=useRef<HTMLDialogElement>(null);const close=useRef(onClose);close.current=requestClose;
 useEffect(()=>{const d=ref.current;const previous=document.activeElement as HTMLElement|null;d?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{d?.close();document.body.style.overflow=old;previous?.focus();};},[]);
 useEffect(()=>{const d=ref.current;if(d){d.scrollTop=0;d.querySelector<HTMLButtonElement>('.dialog-head button')?.focus({preventScroll:true});}},[title]);
 return <CloseGuard.Provider value={guard}><dialog ref={ref} className={wide?'wide':''} aria-labelledby="modal-title" onCancel={e=>{
  // File inputs emit a bubbling cancel event when their picker is dismissed.
  // Only a cancellation of this dialog itself may close the listing editor.
  if(e.target!==e.currentTarget)return;
  e.preventDefault();close.current();
 }} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close.current();}}}><header className="dialog-head"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={requestClose}><X/></button></header>{children}</dialog></CloseGuard.Provider>;
}
