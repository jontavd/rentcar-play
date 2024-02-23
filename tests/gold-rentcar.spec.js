// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const SheetsAppendValues = require('./sheets_append_values');

const monthMap = {
  'Janeiro': 1,
  'Fevereiro': 2,
  'Março': 3,
  'Abril': 4,
  'Maio': 5,
  'Junho': 6,
  'Julho': 7,
  'Agosto': 8,
  'Setembro': 9,
  'Outubro': 10,
  'Novembro': 11,
  'Dezembro': 12
};

const spreadsheetId = '1BWocsH5u98jUbJ9l8ISWTEQDX9dcrUGzWKJCM6l79kU';
const range = 'Goldcar';
const valueInputOption = 'USER_ENTERED';

function getNextWeekendDays(count) {
  const today = new Date();
  today.setDate(today.getDate() + 3);
  const weekendDays = [];

  while (weekendDays.length < count) {
    today.setDate(today.getDate() + 1);
    if (today.getDay() === 6) {
      weekendDays.push(today.toISOString().split('T')[0]);
      today.setDate(today.getDate() + 1);
      weekendDays.push(today.toISOString().split('T')[0]);
    }
  }
  return weekendDays;
}

const nextWeekendDays = getNextWeekendDays(4);

function getPairsOfPickupDropoffDays(nextWeekendDays) {
  const pairs = [];
  for (let i = 0; i < nextWeekendDays.length; i++) {
    for (let j = i + 1; j < nextWeekendDays.length; j++) {
      const pickupDate = new Date(nextWeekendDays[i]);
      const dropoffDate = new Date(nextWeekendDays[j]);
      const daysDifference = Math.floor((Number(dropoffDate) - Number(pickupDate)) / (1000 * 60 * 60 * 24));
      if (daysDifference >= 2 && daysDifference <= 28) {
        pairs.push([nextWeekendDays[i], nextWeekendDays[j]]);
      }
    }
  }
  return pairs;
}

const pairs = getPairsOfPickupDropoffDays(nextWeekendDays);

function isSameMonth(date1, date2) {
  const month1 = new Date(date1).getMonth() + 1;
  const month2 = monthMap[date2.split(' ')[0]];
  return month1 === month2;
}

for (const pair of pairs) {
  const pickup = pair[0];
  const dropoff = pair[1];
  
  let actualDate;
  let actualHour;
  let priorDays;
  let dropoffLocator = '.nombre-meses-dias-right'

  for (const city of ['Lisboa', 'Porto']) {
    test(`city: ${city} - pickup: ${pickup} - dropoff: ${dropoff}`, async ({ page }) => {
      await page.goto('https://www.goldcar.es/pt/');
      await page.getByLabel('Agree and close: Agree to our')?.click();
        
      await page.getByRole('textbox', { name: 'Aeroporto, Cidade,' }).fill(city);
      await page.keyboard.press('Tab');
      if (city === 'Lisboa') {
        await page.getByRole('link', { name: ' Lisboa Aeroporto (LIS)' }).click();
      }
      if (city === 'Porto') {
        await page.getByRole('link', { name: ' Porto Aeroporto (OPO)' }).click();
      }

      let leftMonth = await page.locator('.texto-mes-left').innerText();
      while (!isSameMonth(pickup, leftMonth)) {
        await page.locator('.flecha-derecha').click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        leftMonth = await page.locator('.texto-mes-left').innerText();
      }

      if (pickup.split('-')[1] === dropoff.split('-')[1]) {
        dropoffLocator = '.nombre-meses-dias-left'
      }

      await page.locator('.nombre-meses-dias-left').getByText(pickup.split('-')[2].replace(/^0+/, ''), { exact: true}).click();
      await page.locator(dropoffLocator).getByText(dropoff.split('-')[2].replace(/^0+/, ''), { exact: true}).click();

      await page.locator('#pickuptime').click();
      await page.locator('#hora_19').click();
      await page.locator('#dropofftime').click();
      await page.locator('#hora_19').click();

      await page.locator('#btn-buscar').click();
      await page.waitForLoadState('networkidle');

      const priceKeyGo = await page.locator("div#CC-tarifas-4.row.vehiculo.new-tarifas-4.testab180618_v2.padding-15 div.col-xs-12.descripcion div.row div.col-xs-12.col-md-7.precio div.row div.col-xs-12.col-sm-4.pull-right.tarifa-dispo div.tipo-tarifa div.precioTarifa.PackKeyngo div.precio-dispo-diario.mouseover-tarifa-1.margin-top-5 div.precio_dia").first().innerText();
      const priceCrazy = await page.locator("div#CC-tarifas-4.row.vehiculo.new-tarifas-4.testab180618_v2.padding-15 div.col-xs-12.descripcion div.row div.col-xs-12.col-md-7.precio div.row div.col-xs-12.col-sm-4.pull-right.tarifa-dispo div.tipo-tarifa div.precioTarifa.TNRFullFuelSDC div.precio-dispo-diario.mouseover-tarifa-1.margin-top-5 div.precio_dia").first().innerText();
      
      actualDate = new Date().toISOString().split('T')[0];
      actualHour = new Date().toISOString().split('T')[1].split('.')[0];
      let ta_actualDate = new Date(actualDate);
      let ta_pickup = new Date(pickup);
      let ta_dropoff = new Date(dropoff);
      let diftime = ta_pickup.getTime() - ta_actualDate.getTime();
      priorDays = (diftime / (1000 * 60 * 60 * 24));
      let diftime2 = ta_dropoff.getTime() - ta_pickup.getTime();
      let durationDays = (diftime2 / (1000 * 60 * 60 * 24));      
      console.log("actualDate: " + actualDate);
      console.log("actualHour: " + actualHour);
      console.log("city: " + city);
      console.log("pickup: " + pickup);
      console.log("dropoff: " + dropoff);
      console.log("priceKeyGo: " + priceKeyGo);
      console.log("priceCrazy: " + priceCrazy);
      console.log("priorDays: " + priorDays);
      console.log("durationDays: " + durationDays);
      // fs.writeFileSync('output.csv', `${actualDate};${actualHour};${city};${pickup};${dropoff};${priceKeyGo.split(" ")[0].toString()};${priceCrazy.split(" ")[0].toString()}\n` , {flag: 'a', encoding: 'utf-8'});
      await SheetsAppendValues.appendValues(spreadsheetId, range, valueInputOption, [[actualDate, actualHour, city, pickup, dropoff, priceKeyGo.split(" ")[0].toString(), priceCrazy.split(" ")[0].toString(), priorDays.toString(), durationDays.toString()]]);
    });
  }
}