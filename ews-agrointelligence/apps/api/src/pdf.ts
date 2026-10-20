import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import type {Row} from '../../../packages/database/db.ts';
export async function executivePdf(d:Row){
 const pdf=await PDFDocument.create();pdf.setTitle('EWS AgroIntelligence - Relatório executivo');pdf.setAuthor('EWS Tech');
 const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.04,.09,.19),muted=rgb(.4,.48,.58),blue=rgb(.15,.39,.92),line=rgb(.9,.93,.96);
 let page=pdf.addPage([595.28,841.89]),y=790;
 const clean=(s:any)=>String(s??'Sem dados').replace(/[^\x20-\x7E\xA0-\xFF]/g,'-');
 function newline(){page=pdf.addPage([595.28,841.89]);y=790;}
 function write(s:any,size=10,strong=false,color=navy){const content=clean(s);const words=content.split(/\s+/);let row='';for(const word of words){const trial=row?row+' '+word:word;if(font.widthOfTextAtSize(trial,size)>485&&row){if(y<60)newline();page.drawText(row,{x:50,y,size,font:strong?bold:font,color});y-=size+6;row=word;}else row=trial;}if(row){if(y<60)newline();page.drawText(row,{x:50,y,size,font:strong?bold:font,color});y-=size+8;}}
 const money=(v:any)=>v==null?'Sem dados':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v/100);
 write('EWS TECH / AGROINTELLIGENCE',9,true,blue);y-=14;write('Relatório executivo',26,true);write(d.tenant.name,13);write(`${d.period.start} a ${d.period.end} | Gerado: ${d.updated_at}`,9,false,muted);y-=12;
 if(d.tenant.demo){page.drawRectangle({x:45,y:y-10,width:505,height:30,color:rgb(1,.97,.87)});write('DEMONSTRAÇÃO - Todos os dados são fictícios.',10,true);y-=16;}
 write('Indicadores do período',15,true);
 const metrics=[['Energia informada',d.energy.kwh==null?'Sem dados':d.energy.kwh.toFixed(1)+' kWh'],['Custo elétrico estimado',money(d.energy.cost_cents)],['Faturas contabilizadas',money(d.energy.invoiced_cents)],['Produção de ovos',d.performance.eggs==null?'Sem dados':d.performance.eggs.toLocaleString('pt-BR')],['Custo elétrico por 1.000 ovos',money(d.performance.electric_per_thousand_cents)],['Disponibilidade informada',d.monitor.availability==null?'Coleta insuficiente':d.monitor.availability.toFixed(2)+'%'],['Manutenção realizada',money(d.predict.cost_cents)]];
 for(const [label,value]of metrics){if(y<80)newline();page.drawLine({start:{x:50,y:y+12},end:{x:545,y:y+12},thickness:.5,color:line});write(`${label}: ${value}`,10);y-=4;}
 y-=15;write('Produção diária - ovos',14,true);
 if(d.performance.days.length){const data=d.performance.days,max=Math.max(...data.map((x:Row)=>x.eggs),1);if(y<200)newline();const base=y-125,w=480/data.length;data.forEach((x:Row,i:number)=>page.drawRectangle({x:55+i*w,y:base,width:Math.max(1,w-3),height:x.eggs/max*110,color:blue}));page.drawLine({start:{x:50,y:base},end:{x:545,y:base},thickness:.7,color:line});y=base-20;write(`${data[0].day} a ${data[data.length-1].day} | Pico diário: ${max.toLocaleString('pt-BR')} ovos`,8,false,muted);}else write('Nenhum registro no período.',10,false,muted);
 y-=18;write('Ocorrências recentes - estado atual',14,true);
 for(const item of d.incidents.slice(0,10)){write(`${item.title} | ${item.equipment_name} | ${item.status}`,10,true);write(item.action||'Providência ainda não registrada.',9,false,muted);}
 y-=14;write('Critérios de interpretação',14,true);for(const value of Object.values(d.limits))write(value,9,false,muted);write('Custos estimados não equivalem a economia comprovada. Leituras e produção são registros informados, importados ou simulados, conforme a origem. Não há rateio automático de faturas gerais.',9,false,muted);
 pdf.getPages().forEach((p,i)=>p.drawText(`EWS Tech${d.tenant.demo?' | DEMONSTRACAO - DADOS FICTICIOS':''} | ${i+1}/${pdf.getPageCount()}`,{x:50,y:30,size:8,font,color:muted}));return Buffer.from(await pdf.save());
}
