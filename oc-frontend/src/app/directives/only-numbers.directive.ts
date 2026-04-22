import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appOnlyNumbers]'
})
export class OnlyNumbers {

  constructor(private el: ElementRef<HTMLInputElement>) { }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = this.el.nativeElement;

    const clean = input.value.replace(/\D+/g, '');

    if (input.value !== clean) {
      input.value = clean;

      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

}
