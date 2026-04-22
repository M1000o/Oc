import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appOnlyLetters]'
})
export class OnlyLetters {

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;

    // Letras + espacios (incluye tildes)
    const clean = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');

    if (input.value !== clean) {
      input.value = clean;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
