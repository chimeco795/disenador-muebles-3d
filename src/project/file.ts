import { validProject } from '../validation';
import type { Project } from '../model';
export function encodeProject(project:Project){return JSON.stringify({format:'taller-crj',fileVersion:1,project},null,2);}
export function decodeProject(text:string):Project {let value;try{value=JSON.parse(text);}catch{throw new Error('El archivo no contiene un proyecto legible.');}if(value?.format!=='taller-crj'||value.fileVersion!==1||!validProject(value.project))throw new Error('Archivo incompatible o incompleto. El proyecto actual no se ha cambiado.');return value.project;}
export function downloadProject(project:Project){const url=URL.createObjectURL(new Blob([encodeProject(project)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=(project.name.replace(/[<>:"/\\|?*]/g,'-').trim()||'MiProyecto')+'.crj';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
