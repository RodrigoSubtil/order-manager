export function getWhatsAppUrl(phone: string) {
  let number = phone.replace(/\D/g, '');

  if (number.startsWith('00')) {
    number = number.slice(2);
  }

  if (number.length === 9) {
    number = `351${number}`;
  }

  if (number.length < 9 || number.length > 15) {
    return null;
  }

  return `https://wa.me/${number}`;
}
