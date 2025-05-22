const cpfRegex = /(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})/;
const dateRegex = /(\d{2}[\/.-]\d{2}[\/.-]\d{4})/;

const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');
const step5 = document.getElementById('step5');

const scanBtn = document.getElementById('scanBtn');
const nextToAddress = document.getElementById('nextToAddress');
const sendBtn = document.getElementById('sendBtn');

scanBtn.addEventListener('click', async () => {
  const idFile = document.getElementById('idFile').files[0];
  const addressFile = document.getElementById('addressFile').files[0];
  if(!idFile || !addressFile){
    alert('Selecione os dois arquivos.');
    return;
  }

  step1.classList.add('hidden');
  step2.classList.remove('hidden');

  try{
    const [idText,addressText] = await Promise.all([
      recognizeText(idFile),
      recognizeText(addressFile)
    ]);

    document.getElementById('rawTextId').textContent = idText;
    document.getElementById('rawTextAddr').textContent = addressText;

    const user = parseIdentity(idText);
    const addr = parseAddress(addressText);

    // Preencher campos
    const form = document.getElementById('identityForm');
    form.nome.value = user.nome;
    form.dob.value = user.dob;
    form.cpf.value = user.cpf;
    form.naturalidade.value = user.naturalidade;
    form.mae.value = user.mae;

    const aform = document.getElementById('addressForm');
    aform.endereco.value = addr;

    step2.classList.add('hidden');
    step3.classList.remove('hidden');
  }catch(err){
    console.error(err);
    alert('Erro ao processar documentos: ' + err.message);
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
  }
});

nextToAddress.addEventListener('click',()=>{step3.classList.add('hidden');step4.classList.remove('hidden');});
sendBtn.addEventListener('click',()=>{step4.classList.add('hidden');step5.classList.remove('hidden');});

async function recognizeText(file){
  if(file.type === 'application/pdf'){
    // Extrai primeira página do PDF via pdf.js
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({scale:2});
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
    const dataUrl = canvas.toDataURL('image/png');
    return ocrFromDataUrl(dataUrl);
  }else{
    return new Promise((res,rej)=>{
      const reader = new FileReader();
      reader.onload = () => ocrFromDataUrl(reader.result).then(res).catch(rej);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }
}

async function ocrFromDataUrl(dataUrl){
  const { data:{ text } } = await Tesseract.recognize(dataUrl,'por',{
    logger:m=>console.log(m)
  });
  return text;
}

function parseIdentity(text){
  const lines = text.split(/\n/).map(l=>l.trim()).filter(Boolean);

  // Nome – maior linha em letras
  let nome = lines.reduce((a,b)=>b.length>a.length?b:a,"");
  // Nome pode incluir label
  nome = nome.replace(/NOME.?/i,"").trim();

  const cpf = (text.match(cpfRegex)||[""])[0];
  const dob = (text.match(dateRegex)||[""])[0];

  // Naturalidade
  const natLine = lines.find(l=>/NATURA/i.test(l))||"";
  const naturalidade = natLine.replace(/NATURALIDADE.?/i,"").trim();

  const maeLine = lines.find(l=>/M[ÃA]E/i.test(l))||"";
  const mae = maeLine.replace(/NOME DA M[ÃA]E.?/i,"").trim();

  return {nome,cpf,dob,naturalidade,mae};
}

function parseAddress(text){
  const lines = text.split(/\n/).map(l=>l.trim()).filter(Boolean);
  const candidate = lines.find(l=>/\d+/.test(l))||"";
  return candidate;
}
