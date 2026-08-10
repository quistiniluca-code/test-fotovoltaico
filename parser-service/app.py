import os,re,io,hmac,hashlib,base64,json
from datetime import datetime
from fastapi import FastAPI,UploadFile,File,Form,Header,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import fitz,pytesseract

app=FastAPI(title='ECON Bill Parser',version='1.6')
origins=[x.strip() for x in os.getenv('ECON_ALLOWED_ORIGINS','').split(',') if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins or ['*'],allow_methods=['POST','GET'],allow_headers=['*'])
SECRET=os.getenv('ECON_PARSER_SHARED_SECRET','')
MAX_MB=int(os.getenv('ECON_MAX_UPLOAD_MB','12'))

def b64d(s):
    s += '='*((4-len(s)%4)%4)
    return base64.urlsafe_b64decode(s.encode())
def verify_ticket(token,sid):
    if not SECRET or len(SECRET)<24:return False
    try:
        body,sig=token.split('.',1); exp=hmac.new(SECRET.encode(),body.encode(),hashlib.sha256).digest(); got=b64d(sig)
        if not hmac.compare_digest(exp,got):return False
        p=json.loads(b64d(body)); now=int(datetime.now().timestamp())
        return p.get('v')==1 and p.get('sid')==sid and int(p.get('exp',0))>=now
    except Exception:return False

def num(s):
    if s is None:return None
    s=str(s).replace('\xa0',' ').strip().replace('€','').replace('kWh','').replace('kW','')
    s=re.sub(r'[^0-9,.-]','',s)
    if not s:return None
    if ',' in s and '.' in s:
        if s.rfind(',')>s.rfind('.'):s=s.replace('.','').replace(',','.')
        else:s=s.replace(',','')
    elif ',' in s:s=s.replace('.','').replace(',','.')
    try:return float(s)
    except:return None

def field(v,source='DATO DA BOLLETTA',page=None,confidence=.9):
    return {'value':v,'source':source,'page':page,'confidence':confidence}
def hit(text,patterns,flags=re.I|re.S):
    for p in patterns:
        m=re.search(p,text,flags)
        if m:return m
    return None

def supplier(text):
    u=text.upper()
    if 'HERA COMM' in u or 'GRUPPOHERA' in u:return 'HERA'
    if 'DOLOMITI ENERGIA' in u:return 'Dolomiti Energia'
    if 'OCTOPUS ENERGY' in u:return 'Octopus Energy'
    if 'PLENITUDE' in u:return 'Plenitude'
    if 'E.ON' in u or 'EON ENERGIA' in u:return 'E.ON'
    return 'Fornitore non riconosciuto'

def extract(text):
    t=' '.join(text.replace('\r','\n').split())
    out={}; sup=supplier(t)
    m=hit(t,[r'consumo annuo(?: aggiornato[^:]{0,90})?[: ]+([\d\.]+(?:,\d+)?)\s*kWh',r'in un anno hai consumato\s*([\d\.]+(?:,\d+)?)\s*kWh',r'totale consumo annuo[^:]{0,80}:\s*([\d\.]+(?:,\d+)?)\s*kWh',r'CONSUMO ANNUO[^0-9]{0,40}([\d\.]+(?:,\d+)?)\s*kWh',r'consumo annuo \(kWh\)[: ]+([\d\.]+(?:,\d+)?)'])
    if m:out['annual_kwh']=field(num(m.group(1)))
    m=hit(t,[r'(?:totale )?spesa annua(?: sostenuta)?[^:]{0,100}:\s*([\d\.]+,\d{2})\s*€',r'SPESA ANNUA[^0-9]{0,80}([\d\.]+,\d{2})\s*€'])
    if m:out['annual_spend']=field(num(m.group(1)))
    m=hit(t,[r'consumo totale fatturato(?: del periodo)?[: ]+([\d\.]+(?:,\d+)?)\s*kWh',r'CONSUMO FATTURATO[: ]+([\d\.]+(?:,\d+)?)\s*kWh',r'QUOTA PER CONSUMI\s+([\d\.]+(?:,\d+)?)\s*kWh'])
    if m:out['period_kwh']=field(num(m.group(1)))
    m=hit(t,[r'TOTALE BOLLETTA\s+([\d\.]+,\d{2})\s*€',r'Totale bolletta\s+([\d\.]+,\d{2})\s*€',r'Totale da pagare[: ]+([\d\.]+,\d{2})\s*€'])
    if m:out['bill_amount']=field(num(m.group(1)))
    m=hit(t,[r'(?:Codice |Punto di prelievo \()?POD\)?[: ]+\s*(IT\d{3}E\d{6,})'])
    if m:out['pod']=field(m.group(1).strip())
    m=hit(t,[r'Potenza impegnata[: ]+\s*([\d,\.]+)\s*kW'])
    if m:out['power_kw']=field(num(m.group(1)))
    m=hit(t,[r'(?:Indirizzo di fornitura|Servizio fornito in)[: ]+(.{5,100}?)(?=\s+(?:Codice POD|Punto di prelievo|Potenza|Scontrino|Quota|$))'])
    if m:out['supply_address']=field(m.group(1).strip(' .'))
    m=hit(t,[r'F1\s+F2\s+F3\s+TOTALE[^0-9]{0,50}([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)',r'CONSUMO ANNUO kWh\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)'])
    if m:
        vals=[num(m.group(i)) for i in range(1,4)]
        if all(v is not None for v in vals):out.update({'f1_kwh':field(vals[0]),'f2_kwh':field(vals[1]),'f3_kwh':field(vals[2])})
    m=hit(t,[r'(?:dal|Periodo di riferimento considerato da)\s*(\d{2}/\d{2}/\d{4})\s*(?:al|a)\s*(\d{2}/\d{2}/\d{4})'])
    if m:
        try:
            a=datetime.strptime(m.group(1),'%d/%m/%Y');b=datetime.strptime(m.group(2),'%d/%m/%Y');months=max(1,round((b-a).days/30.44));out['coverage_months']=field(months,'CALCOLATO DA BOLLETTA',confidence=.95)
        except:pass
    if 'annual_kwh' not in out and 'period_kwh' in out:
        pm=None
        m=hit(t,[r'Periodo (?:oggetto di )?fatturazione[: ]+(?:dal )?(\d{1,2}[\./]\d{1,2}[\./]\d{4}).{0,12}(?:al|-)(?:\s*)(\d{1,2}[\./]\d{1,2}[\./]\d{4})'])
        if m:
            try:
                fmt='%d/%m/%Y' if '/' in m.group(1) else '%d.%m.%Y';a=datetime.strptime(m.group(1),fmt);b=datetime.strptime(m.group(2),fmt);pm=max(1,(b-a).days+1)
            except:pass
        if pm:out['annual_kwh']=field(round(out['period_kwh']['value']*365/pm,2),'CALCOLATO DA BOLLETTA',confidence=.65)
    if 'annual_spend' not in out and 'bill_amount' in out and 'period_kwh' in out and 'annual_kwh' in out and out['period_kwh']['value']:
        ratio=out['annual_kwh']['value']/out['period_kwh']['value'];out['annual_spend']=field(round(out['bill_amount']['value']*ratio,2),'CALCOLATO DA BOLLETTA',confidence=.55)
    return sup,out

def pdf_text(data):
    doc=fitz.open(stream=data,filetype='pdf');pages=[]
    for p in doc:pages.append(p.get_text('text') or '')
    return '\n'.join(pages),doc

def ocr_pdf(doc,max_pages=5):
    chunks=[]
    for p in doc[:max_pages]:
        pix=p.get_pixmap(matrix=fitz.Matrix(1.7,1.7),alpha=False)
        img=Image.open(io.BytesIO(pix.tobytes('png')))
        chunks.append(pytesseract.image_to_string(img,lang=os.getenv('OCR_LANG','ita+eng')))
    return '\n'.join(chunks)

@app.get('/health')
def health():return {'ok':True,'version':'1.6'}
@app.post('/parse')
async def parse(file:UploadFile=File(...),session_id:str=Form(...),authorization:str|None=Header(None)):
    token=(authorization or '').removeprefix('Bearer ').strip()
    if not verify_ticket(token,session_id):raise HTTPException(401,'invalid_parser_ticket')
    data=await file.read()
    if len(data)>MAX_MB*1024*1024:raise HTTPException(413,'file_too_large')
    ctype=(file.content_type or '').lower(); text=''; mode='text'
    try:
        if 'pdf' in ctype or file.filename.lower().endswith('.pdf'):
            text,doc=pdf_text(data)
            if len(re.sub(r'\s','',text))<300:mode='ocr';text=ocr_pdf(doc)
        elif ctype.startswith('image/'):
            mode='ocr';text=pytesseract.image_to_string(Image.open(io.BytesIO(data)),lang=os.getenv('OCR_LANG','ita+eng'))
        else:raise HTTPException(415,'unsupported_file')
    except HTTPException:raise
    except Exception as e:raise HTTPException(422,f'parse_failed:{type(e).__name__}')
    sup,fields=extract(text)
    if 'annual_kwh' not in fields:raise HTTPException(422,'annual_consumption_not_found')
    return {'schema':'econ.bill.v1','supplier':sup,'parser_mode':mode,'fields':fields,'meta':{'text_chars':len(text),'bill_file_stored':False}}
