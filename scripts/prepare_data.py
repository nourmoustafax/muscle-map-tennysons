#!/usr/bin/env python3
"""Transform source CSVs into canonical records; never fabricate values or dates."""
import csv, hashlib, json
from decimal import Decimal
from pathlib import Path
from acquire_data import ROOT, FILES
UNIT_SOURCE='https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/'
REGION={'Quadriceps':'RIGHT_QUADRICEPS_GROUP','Medial_Gastrocnemius':'RIGHT_MEDIAL_GASTROCNEMIUS'}
SITES={'RIGHT_QUADRICEPS_GROUP':'Right thigh / source-defined group','RIGHT_MEDIAL_GASTROCNEMIUS':'Right posterior calf / medial head'}
def prepare():
    records=[];manifest=[];examples=[]
    for label,uuid,expected in FILES:
        filename=f'BEDREST_IRATS_MRI_ULTRASOUND_CFT70_{label}.csv';path=ROOT/'data/raw'/filename
        original=path.read_bytes();assert hashlib.sha256(original).hexdigest()==expected,filename
        rows=list(csv.DictReader(original.decode('utf-8-sig').splitlines()))
        assert len(rows)==351 and len({r['Subject'] for r in rows})==27
        modality='Panoramic ultrasound' if label.startswith('Ultrasound') else 'MRI'
        region=REGION['Quadriceps' if label.endswith('Quadriceps') else 'Medial_Gastrocnemius']
        measurement='Quadriceps' if region=='RIGHT_QUADRICEPS_GROUP' else 'Medial Gastrocnemius'
        source_id=f'CFT70-{label.replace("_","-")}'
        missing=0
        for r in rows:
            rawday=int(r['BR_Day']);rawphase=r['Test_Phase'];baseline=rawphase=='PRE_TEST'
            # BR+ denotes days AFTER 70-day bed rest, not the same day as BR3.
            if baseline: day=-rawday;point=f'BR-{rawday}';phase='baseline'
            elif rawphase=='IN_TEST': day=rawday;point=f'BR{rawday}';phase='bed rest'
            elif rawphase=='POST_TEST': day=70+rawday;point=f'BR+{rawday}';phase='recovery'
            else: raise ValueError('Unknown original phase')
            raw=r[measurement];value=None if raw=='NA' else float(Decimal(raw));missing+=value is None
            records.append(dict(id=f'nasa-{uuid}-{r["ID"]}',participant=r['Subject'],mode='research',stream='anatomy',region=region,side='right',day=day,timepoint=point,phase=phase,value=value,unit='cm²',measurement='CSA',modality=modality,protocol=f'CFT70 {modality} source-defined averaged-slice CSA',site=SITES[region],quality='missing' if value is None else 'valid',sourceId=source_id,sourceRow=r['ID'],namespace='nasa-cft70-anatomy',linkage='verified',baseline=baseline,note=f'Group: {r["Group"]}; original Test_Phase={rawphase}, BR_Day={rawday}. Calendar acquisition date is not supplied. Unit cm² is assigned from the associated published CSA study, not stated in CSV header.'))
        manifest.append(dict(id=source_id,title=f'CFT70 {modality} — {measurement}',provider='NASA NLSP / JSC LSDA',url=f'https://nlsp.nasa.gov/api/v1/files/{uuid}/download',access='Retrieved public CSV · immutable original',format='UTF-8 BOM / CSV',hash=expected,rows=len(rows),missing=missing,license='No file-specific license field supplied. Publicly accessible NASA research; retain attribution. Confirm redistribution terms with NLSP for a new use.',limits='27 de-identified ground-analog participants, not astronauts. Right-leg CSA only. Units from associated paper; no CSV unit header. PRE_TEST -> -BR_Day; POST_TEST -> 70+BR_Day. No invented calendar dates.'))
        for participant in ['7326','7036']:
            values=[r for r in rows if r['Subject']==participant]
            before=next(r for r in values if r['Test_Phase']=='PRE_TEST')
            last=next(r for r in values if r['Test_Phase']=='IN_TEST' and r['BR_Day']=='69')
            pct=(Decimal(last[measurement])-Decimal(before[measurement]))/Decimal(before[measurement])*Decimal(100)
            examples.append(dict(participant=participant,modality=modality,region=region,baselineId=before['ID'],latestId=last['ID'],baseline=float(Decimal(before[measurement])),latest=float(Decimal(last[measurement])),day=69,percentChange=float(pct)))
    assert len(records)==1404 and sum(r['value'] is None for r in records)==10
    output=ROOT/'public/data';output.mkdir(parents=True,exist_ok=True)
    (output/'research.json').write_text(json.dumps(records,indent=2,ensure_ascii=False)+'\n')
    for title,url,limits in [('MR079G isokinetic function','https://nlsp.nasa.gov/search/data/details/0dfd2185-49cf-567d-b744-d7177301e7ff?dataType=DATASETS','Downloaded and evaluated; not joined. Units and participant crosswalk not established for individual inference.'),('BEDREST_FTT functional tasks','https://nlsp.nasa.gov/search/data/details/933d244c-5967-54ee-90c6-ce560da2108d?dataType=DATASETS','Public files exist. Multi-muscle task outcomes and phase/date semantics need a validated crosswalk; not integrated as direct anatomy.'),('Power Cycle Summary','https://nlsp.nasa.gov/search/data/details/0e311656-88ad-5871-9749-2922e6e0ff7a?dataType=DATASETS','Public CSVs evaluated. Cycling power is whole-task context, not a single-muscle CSA measure; no unverified participant-level join.'),('CFT70 symptoms and issues','https://nlsp.nasa.gov/','Evaluated but not integrated. Clinical text and sparse participants require privacy/rights and documented crosswalk review.')]:
        manifest.append(dict(id=title.replace(' ','-'),title=title,provider='NASA NLSP',url=url,access='Evaluated · not integrated',format='CSV / catalog metadata',license='No dataset-specific grant established; retrieval instructions in docs.',limits=limits))
    (output/'source-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    (ROOT/'data/expected-results.json').write_text(json.dumps(examples,indent=2)+'\n')
    print(f'Prepared {len(records)} research rows, 27 participants, 10 source NA cells; 8 Decimal reference calculations.')
    for e in examples: print(e)
if __name__=='__main__': prepare()
