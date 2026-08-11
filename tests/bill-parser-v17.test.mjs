import assert from 'node:assert/strict';
import { __test } from '../public/assets/bill-parser.js';

const { extract } = __test;
const approx = (actual, expected, tolerance = 0.01) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

{
  const bill = extract([
    `Octopus Energy BOLLETTA LUCE CONSUMO FATTURATO: 210 kWh Consumo annuo 01/09/2024 - 31/08/2025 2695 kWh/anno`,
    `Scontrino dell'energia TOTALE BOLLETTA 63,45 €`,
    `Informazioni storiche sui consumi SPESA ANNUA: Periodo di riferimento considerato da 01/09/2024 a 31/08/2025: 962,05 € CONSUMO ANNUO: Periodo di riferimento considerato da 01/09/2024 a 31/08/2025: 2695 kWh`,
  ], 'text');
  assert.equal(bill.supplier, 'Octopus Energy');
  assert.equal(bill.fields.annual_kwh.value, 2695);
  assert.equal(bill.fields.annual_kwh.source, 'DATO DA BOLLETTA');
  approx(bill.fields.annual_spend.value, 962.05);
  assert.equal(bill.fields.annual_spend.source, 'DATO DA BOLLETTA');
  assert.equal(bill.fields.period_kwh.value, 210);
  approx(bill.fields.bill_amount.value, 63.45);
  assert.equal(bill.fields.coverage_months.value, 12);
}

{
  const bill = extract([
    `Eni Plenitude Periodo di fatturazione: dal 01/01/2026 al 28/02/2026 Luce Consumo totale fatturato del periodo 2566 kWh In un anno hai consumato 10.000 kWh (dal 01/07/2025 al 28/02/2026)`,
    `Indirizzo di fornitura VIA ESEMPIO 2, 23884 COMUNE LC Potenza Impegnata 6 kW Scontrino dell'energia Totale bolletta 577,49 €`,
    `Informazioni storiche Consumo annuo dal 01/07/2025 al 28/02/2026`,
  ], 'text');
  assert.equal(bill.supplier, 'Plenitude');
  assert.equal(bill.fields.annual_kwh.value, 10000);
  assert.equal(bill.fields.period_kwh.value, 2566);
  approx(bill.fields.bill_amount.value, 577.49);
  assert.equal(bill.fields.power_kw.value, 6);
  assert.equal(bill.fields.coverage_months.value, 8);
  approx(bill.fields.annual_spend.value, 2250.55, 0.02);
  assert.equal(bill.fields.annual_spend.source, 'CALCOLATO DA BOLLETTA');
}

console.log('Bill parser regression: PASS · Octopus + Plenitude');
