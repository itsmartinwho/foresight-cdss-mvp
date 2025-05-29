import { describe, it, expect } from 'vitest';
import { cn, formatDate } from '@/lib/utils'; // Assuming @ refers to src

describe('cn function', () => {
  it('should return an empty string with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('should return the same string with one argument', () => {
    expect(cn('bg-red-500')).toBe('bg-red-500');
  });

  it('should concatenate multiple string arguments', () => {
    expect(cn('text-lg', 'font-bold', 'py-2')).toBe('text-lg font-bold py-2');
  });

  it('should handle conditional arguments', () => {
    expect(cn('base-class', { 'conditional-class': true, 'another-class': false })).toBe('base-class conditional-class');
  });

  it('should merge and deduplicate Tailwind classes', () => {
    // Basic check, twMerge handles complex cases
    expect(cn('p-4', 'p-2')).toBe('p-2'); // Last one wins for conflicting properties
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('px-2', 'py-2', 'p-4')).toBe('p-4'); // p-4 should override px-2 and py-2
    expect(cn('font-semibold', 'font-bold')).toBe('font-bold');
  });

  it('should handle mixed string and conditional arguments', () => {
    expect(cn('static-class', { 'active': true, 'disabled': false }, 'another-static')).toBe('static-class active another-static');
  });

  it('should handle arrays of class names', () => {
    expect(cn(['class1', 'class2'], { 'class3': true }, 'class4')).toBe('class1 class2 class3 class4');
  });
});

describe('formatDate function', () => {
  it('should format a valid date object correctly', () => {
    const date = new Date(2023, 0, 1); // January 1, 2023
    expect(formatDate(date)).toBe('Jan 1, 2023');
  });

  it('should format a date with a different month and day', () => {
    const date = new Date(2024, 4, 15); // May 15, 2024
    expect(formatDate(date)).toBe('May 15, 2024');
  });

  it('should format a date at the end of the year', () => {
    const date = new Date(2023, 11, 31); // December 31, 2023
    expect(formatDate(date)).toBe('Dec 31, 2023');
  });

  it('should format a date in a leap year', () => {
    const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
    expect(formatDate(date)).toBe('Feb 29, 2024');
  });
});
