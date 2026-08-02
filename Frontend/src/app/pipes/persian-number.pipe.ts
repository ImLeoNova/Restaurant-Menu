import { Pipe, PipeTransform } from '@angular/core';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

export function formatToman(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return '۰';
  const n = Math.round(Number(value));
  const withSep = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  return toPersianDigits(withSep);
}

@Pipe({ name: 'persianNumber', standalone: true })
export class PersianNumberPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value == null) return '';
    return toPersianDigits(value);
  }
}

@Pipe({ name: 'toman', standalone: true })
export class TomanPipe implements PipeTransform {
  transform(value: number | null | undefined, suffix = true): string {
    const formatted = formatToman(value);
    return suffix ? `${formatted} تومان` : formatted;
  }
}
