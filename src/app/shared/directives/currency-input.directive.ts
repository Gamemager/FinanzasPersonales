import { Directive, ElementRef, Renderer2, forwardRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Uso: <input type="text" inputmode="numeric" appCurrencyInput formControlName="amount" />
 *
 * Muestra el número formateado con separador de miles (es-CO: 1.234.567)
 * mientras el FormControl sigue recibiendo un number plano (1234567),
 * listo para convertir a string y enviar a la API.
 */
@Directive({
  selector: '[appCurrencyInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputDirective),
      multi: true,
    },
  ],
})
export class CurrencyInputDirective implements ControlValueAccessor {
  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>, private renderer: Renderer2) {}

  writeValue(value: number | string | null): void {
    const numeric = typeof value === 'string' ? Number(value) : value;
    this.renderer.setProperty(this.el.nativeElement, 'value', this.format(numeric ?? 0));
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input ? input.value : '';
    const numeric = this.parse(value);
    
    this.renderer.setProperty(this.el.nativeElement, 'value', this.format(numeric));
    this.onChange(numeric);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  private parse(value: string): number {
    const digitsOnly = value.replace(/[^\d]/g, '');
    return digitsOnly ? Number(digitsOnly) : 0;
  }

  private format(value: number): string {
    if (!value) return '';
    return new Intl.NumberFormat('es-CO').format(value);
  }
}