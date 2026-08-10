export const numberToFrenchWords = (num) => {
  if (num === 0) return 'zéro';
  
  const unities = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];

  const convertLessThanOneThousand = (n) => {
    let words = '';
    
    if (n >= 100) {
      const h = Math.floor(n / 100);
      if (h === 1) words += 'cent ';
      else words += unities[h] + ' cent ';
      n %= 100;
      if (n === 0 && h > 1) words = words.trim() + 's ';
    }

    if (n >= 10 && n <= 19) {
      words += teens[n - 10] + ' ';
    } else if (n >= 20 || n === 10) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      
      if (t === 7 || t === 9) {
        words += tens[t - 1] + '-';
        words += teens[u] + ' ';
      } else {
        words += tens[t] + ' ';
        if (u === 1 && t !== 8) words += 'et un ';
        else if (u > 0) words += unities[u] + ' ';
      }
    } else if (n > 0) {
      words += unities[n] + ' ';
    }
    
    return words.trim();
  };

  let word = '';
  const millions = Math.floor(num / 1000000);
  num %= 1000000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;

  if (millions > 0) {
    if (millions === 1) word += 'un million ';
    else word += convertLessThanOneThousand(millions) + ' millions ';
  }

  if (thousands > 0) {
    if (thousands === 1) word += 'mille ';
    else word += convertLessThanOneThousand(thousands) + ' mille ';
  }

  if (num > 0 || word === '') {
    word += convertLessThanOneThousand(num);
  }

  return word.trim();
};

export const amountToFrench = (amount, currency = 'Dinars') => {
  const wholePart = Math.floor(amount);
  const decimalPart = Math.round((amount - wholePart) * 100);
  
  let text = numberToFrenchWords(wholePart) + ' ' + currency;
  if (decimalPart > 0) {
    text += ' et ' + numberToFrenchWords(decimalPart) + ' centimes';
  }
  
  return text.charAt(0).toUpperCase() + text.slice(1);
};
