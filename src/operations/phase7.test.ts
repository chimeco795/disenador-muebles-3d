import { beforeEach, expect, it } from 'vitest';
import { useEditor, validProject } from '../store';
import { joinEnd, joinReview } from '../assembly/model';
import { area, operationError, outline } from './geometry';
import { buildReport } from '../report/model';
import { createReportPdf } from '../report/pdf';
import { optimizeBoards } from '../optimization/boards';
const state=()=>useEditor.getState();
beforeEach(()=>useEditor.setState({project:{version:1,name:'Prueba de taller',pieces:[]},past:[],future:[],selected:null}));
it('repeats rip cuts, transformations and duplicates with stable origins and history',()=>{
 state().add('pino-100');const source=state().project.pieces[0].sourceMaterialId;state().cut(state().selected!,40,'width',3);
 const first=state().project.pieces[0],rest=state().project.pieces[1];expect([first.width,rest.width]).toEqual([40,57]);state().select(rest.id);state().repeat();
 expect(state().project.pieces.map(p=>p.width)).toEqual([40,40,14]);expect(state().project.pieces.every(p=>p.sourceMaterialId===source)).toBe(true);
 state().undo();expect(state().project.pieces).toHaveLength(2);state().redo();expect(state().project.pieces).toHaveLength(3);
 state().update(first.id,{position:[10,20,30],rotation:[0,0,45]});state().select(first.id);state().repeat();expect(state().project.pieces[0].rotation[2]).toBe(90);
 state().duplicate();const count=state().project.pieces.length;state().repeat();expect(state().project.pieces).toHaveLength(count+1);expect(validProject(JSON.parse(JSON.stringify(state().project)))).toBe(true);
});
it('retains joins through move, cut, undo and reload; emits readable report and PDF',()=>{
 state().add('pino-100',[0,9,0]);const a=state().project.pieces[0];state().add('pino-100',[3000,9,0]);const b=state().project.pieces[1];
 const join={id:'internal-join-id',a:joinEnd(a,'right'),b:joinEnd(b,'left'),type:'Tornillos' as const,quantity:4,diameter:4,length:40};state().saveJoin(join);expect(joinReview(state().project,join)).toBeNull();
 state().update(b.id,{position:[3100,9,0]});expect(joinReview(state().project,join)).toContain('contacto');state().undo();expect(joinReview(state().project,join)).toBeNull();
 state().cut(a.id,720);expect(state().project.joins).toHaveLength(1);expect(joinReview(state().project,join)).toContain('subdividida');state().undo();state().optimize();
 const report=buildReport(state().project,'optimized');expect(report.assembly[0]).toMatchObject({pieces:'A1 + B1',review:null});expect(report.assembly[0].description).toContain('4 × Tornillos');
 const pdf=createReportPdf(report).output();expect(pdf).toContain('%PDF');expect(pdf).not.toContain('internal-join-id');expect(pdf).not.toContain('sourceMaterialId');
 const saved=JSON.parse(JSON.stringify(state().project));expect(validProject(saved)).toBe(true);expect(joinReview(saved,saved.joins[0])).toBeNull();state().deleteJoin(join.id);state().undo();expect(state().project.joins).toHaveLength(1);
});
it('validates finishes, updates manufacturing and rejects malformed persisted metadata',()=>{
 state().add('mdf-18');const p=state().project.pieces[0];
 const angular={id:'angle',kind:'angular' as const,axis:'length' as const,angle:45,offset:1200,keep:'start' as const,kerf:3};expect(operationError(p,angular)).toBeNull();expect(area(outline(p,[angular]))).toBeLessThan(p.length*p.width);
 state().addOperation(p.id,angular);expect(state().project.pieces[0].usage).toBe('used');state().addOperation(p.id,{id:'hole',kind:'drill',face:'top',u:100,v:100,diameter:8,depth:18});
 expect(buildReport(state().project,'current').specials[0].operations).toHaveLength(2);expect(validProject(state().project)).toBe(true);
 expect(validProject({...state().project,lastAction:{kind:'special',operation:{id:'bad',kind:'drill',face:'invalid'}}})).toBe(false);
 const before=state().project;state().cut(p.id,200);expect(state().project).toBe(before);
});
it('rip optimization conserves material including both kerf bands',()=>{
 const supply={id:'wood',catalogMaterialId:'wood',materialType:'Pino',length:3000,width:100,height:18,kind:'new' as const,sheet:false};
 const result=optimizeBoards([{id:'part',code:'A2',catalogMaterialId:'wood',materialType:'Pino',sourceMaterialId:'TABLA-001',length:720,width:40,height:18,rotationAllowed:false}],supply,[],3);
 expect(result.unplaced).toHaveLength(0);const s=result.stocks[0];expect(s.cuts.map(c=>c.axis)).toEqual(['length','width']);
 expect([...s.placements,...s.remaining,...s.cuts].reduce((n,r)=>n+r.length*r.width,0)).toBe(300000);
});
