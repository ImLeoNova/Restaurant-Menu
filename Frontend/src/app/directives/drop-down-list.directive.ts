import {
  booleanAttribute,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
} from '@angular/core';

export interface DropDownOptionSelected {
  value: string;
  label: string;
  element: HTMLElement;
}

@Directive({
  standalone: true,
  selector: '[appDropDownList]',
  exportAs: 'appDropDownList',
})
export class DropDownListDirective implements OnInit, OnDestroy {
  @Input() inputElement?: HTMLElement | ElementRef<HTMLElement>;
  @Input() dropdownWidth: 'parent' | string = 'parent';
  @Input({ transform: booleanAttribute }) appFormField = true;
  @Input() dropdownHeight = 220;
  @Input() overlayBlurClass = 'backdrop-blur-sm';
  @Input() placeholder = 'انتخاب کنید';

  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() optionSelected = new EventEmitter<DropDownOptionSelected>();

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly renderer = inject(Renderer2);

  private wrapperDiv!: HTMLElement;
  private overlayDiv?: HTMLElement;
  private removeOutsideClickListener?: () => void;
  private removeTriggerClickListener?: () => void;
  private removeOptionClickListener?: () => void;
  private removeEscapeListener?: () => void;
  private boundScroll!: EventListenerOrEventListenerObject;
  private isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  private isOpen = false;
  private initialized = false;

  private readonly panelBase = [
    'app-dropdown-panel',
    'yekan',
    'overflow-y-auto',
    'overflow-x-hidden',
    'transition-all',
    'duration-300',
    'ease-out',
    'max-h-0',
    'opacity-0',
    'pointer-events-none',
  ];

  private readonly desktopClasses = [
    ...this.panelBase,
    'fixed',
    'z-[1000]',
    'rounded-2xl',
    'border',
    'border-white/10',
    'bg-[#111827]/95',
    'backdrop-blur-xl',
    'shadow-[0_24px_60px_rgba(0,0,0,0.55)]',
    'p-1.5',
  ];

  private readonly mobileClasses = [
    ...this.panelBase,
    'fixed',
    'bottom-0',
    'left-0',
    'right-0',
    'w-full',
    'z-[9999]',
    'rounded-t-[1.75rem]',
    'border',
    'border-white/10',
    'border-b-0',
    'bg-[#0f1524]/98',
    'backdrop-blur-xl',
    'shadow-[0_-20px_60px_rgba(0,0,0,0.55)]',
    'p-3',
    'pb-6',
  ];

  ngOnInit(): void {
    this.renderer.addClass(this.el, 'hidden');
    this.renderer.setStyle(this.el, 'display', 'none');

    this.wrapperDiv = this.renderer.createElement('div');
    this.renderer.setAttribute(this.wrapperDiv, 'role', 'listbox');
    this.renderer.setAttribute(this.wrapperDiv, 'dir', 'rtl');

    while (this.el.firstChild) {
      this.renderer.appendChild(this.wrapperDiv, this.el.firstChild);
    }

    this.styleOptions();
    this.bindTrigger();
    this.boundScroll = this.onScroll.bind(this);
    window.addEventListener('scroll', this.boundScroll, true);
    this.initialized = true;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isOpen) return;
    this.setMobileOrDesktopClasses();
    this.setPosition();
  }

  toggle(): void {
    if (this.isOpen) {
      this.hideDropdown();
    } else {
      this.showDropdown();
    }
  }

  showDropdown(): void {
    if (!this.initialized || this.isOpen) return;

    this.syncChildrenFromHost();
    this.isOpen = true;
    this.opened.emit();
    this.setTriggerOpenState(true);
    this.styleOptions();
    this.markActiveOption();

    if (!document.body.contains(this.wrapperDiv)) {
      this.renderer.appendChild(document.body, this.wrapperDiv);
      this.bindOptionClicks();
    }

    this.wrapperDiv.className = '';
    this.setMobileOrDesktopClasses();

    if (this.isMobile) {
      const overlay = this.renderer.createElement('div');
      this.renderer.addClass(overlay, 'app-dropdown-overlay');
      this.renderer.addClass(overlay, 'fixed');
      this.renderer.addClass(overlay, 'inset-0');
      this.renderer.addClass(overlay, 'z-[500]');
      this.renderer.addClass(overlay, 'bg-black/55');
      this.renderer.addClass(overlay, 'transition-opacity');
      this.renderer.addClass(overlay, 'duration-300');
      this.renderer.addClass(overlay, this.overlayBlurClass);
      this.renderer.appendChild(document.body, overlay);
      this.renderer.listen(overlay, 'click', () => this.hideDropdown());
      this.overlayDiv = overlay;

      requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight;
        const maxHeight = Math.min(this.dropdownHeight, viewportHeight * 0.55);
        this.renderer.setStyle(this.wrapperDiv, 'max-height', `${maxHeight}px`);
        this.renderer.setStyle(this.wrapperDiv, 'opacity', '1');
        this.renderer.removeClass(this.wrapperDiv, 'pointer-events-none');
        this.renderer.addClass(this.wrapperDiv, 'pointer-events-auto');
      });
    } else {
      this.setPosition();
      requestAnimationFrame(() => {
        this.renderer.setStyle(
          this.wrapperDiv,
          'max-height',
          `${this.dropdownHeight}px`,
        );
        this.renderer.setStyle(this.wrapperDiv, 'opacity', '1');
        this.renderer.removeClass(this.wrapperDiv, 'pointer-events-none');
        this.renderer.addClass(this.wrapperDiv, 'pointer-events-auto');
      });
    }

    this.removeOutsideClickListener = this.renderer.listen(
      'document',
      'click',
      (event: Event) => {
        const target = event.target as Node;
        const inputEl = this.getInputNative();
        if (
          !this.wrapperDiv.contains(target) &&
          !inputEl?.contains(target) &&
          !this.overlayDiv?.contains(target)
        ) {
          this.hideDropdown();
        }
      },
    );

    this.removeEscapeListener = this.renderer.listen(
      'document',
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.hideDropdown();
        }
      },
    );
  }

  hideDropdown(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.closed.emit();
    this.setTriggerOpenState(false);
    this.renderer.setStyle(this.wrapperDiv, 'max-height', '0px');
    this.renderer.setStyle(this.wrapperDiv, 'opacity', '0');
    this.renderer.addClass(this.wrapperDiv, 'pointer-events-none');
    this.renderer.removeClass(this.wrapperDiv, 'pointer-events-auto');

    setTimeout(() => {
      if (document.body.contains(this.wrapperDiv)) {
        this.renderer.removeChild(document.body, this.wrapperDiv);
      }
      if (this.overlayDiv && document.body.contains(this.overlayDiv)) {
        this.renderer.removeChild(document.body, this.overlayDiv);
      }
      this.overlayDiv = undefined;
    }, 280);

    this.removeOutsideClickListener?.();
    this.removeOutsideClickListener = undefined;
    this.removeEscapeListener?.();
    this.removeEscapeListener = undefined;
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.boundScroll, true);
    this.removeOutsideClickListener?.();
    this.removeTriggerClickListener?.();
    this.removeOptionClickListener?.();
    this.removeEscapeListener?.();
    this.setTriggerOpenState(false);

    if (this.overlayDiv && document.body.contains(this.overlayDiv)) {
      this.renderer.removeChild(document.body, this.overlayDiv);
    }
    if (this.wrapperDiv && document.body.contains(this.wrapperDiv)) {
      this.renderer.removeChild(document.body, this.wrapperDiv);
    }
  }

  private syncChildrenFromHost(): void {
    while (this.el.firstChild) {
      this.renderer.appendChild(this.wrapperDiv, this.el.firstChild);
    }
  }

  private bindTrigger(): void {
    const inputEl = this.getInputNative();
    if (!inputEl) return;

    this.renderer.addClass(inputEl, 'app-dropdown-trigger');
    this.renderer.setAttribute(inputEl, 'role', 'combobox');
    this.renderer.setAttribute(inputEl, 'aria-haspopup', 'listbox');
    this.renderer.setAttribute(inputEl, 'aria-expanded', 'false');

    if (inputEl instanceof HTMLInputElement) {
      this.renderer.setAttribute(inputEl, 'readonly', 'true');
      this.renderer.setStyle(inputEl, 'cursor', 'pointer');
    } else {
      this.renderer.setStyle(inputEl, 'cursor', 'pointer');
    }

    this.removeTriggerClickListener = this.renderer.listen(inputEl, 'click', (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggle();
    });
  }

  private bindOptionClicks(): void {
    this.removeOptionClickListener?.();
    this.removeOptionClickListener = this.renderer.listen(
      this.wrapperDiv,
      'click',
      (event: Event) => {
        const target = event.target as HTMLElement;
        const option =
          (target.closest('[data-dropdown-option]') as HTMLElement | null) ||
          (target.tagName === 'LI' ? target : (target.closest('li') as HTMLElement | null)) ||
          (target.closest('button') as HTMLElement | null);

        if (!option || !this.wrapperDiv.contains(option)) return;

        const label =
          option.getAttribute('data-label')?.trim() ||
          option.textContent?.trim() ||
          '';
        const value =
          option.getAttribute('data-value')?.trim() ||
          option.getAttribute('value')?.trim() ||
          label;

        if (!value && !label) return;

        const inputEl = this.getInputNative();
        if (inputEl) {
          if (inputEl instanceof HTMLInputElement) {
            this.renderer.setProperty(inputEl, 'value', label || value);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            const labelNode = inputEl.querySelector('[data-dropdown-label]');
            if (labelNode) {
              this.renderer.setProperty(
                labelNode,
                'textContent',
                label || value || this.placeholder,
              );
            }
          }
          this.renderer.setAttribute(inputEl, 'data-value', value);
        }

        this.optionSelected.emit({
          value,
          label: label || value,
          element: option,
        });

        this.hideDropdown();
      },
    );
  }

  private styleOptions(): void {
    const options = this.wrapperDiv.querySelectorAll(
      'li, button, [data-dropdown-option]',
    );
    options.forEach((option) => {
      this.renderer.addClass(option, 'app-dropdown-option');
      this.renderer.setAttribute(option, 'role', 'option');
      if (!option.hasAttribute('data-dropdown-option')) {
        this.renderer.setAttribute(option, 'data-dropdown-option', '');
      }
    });
  }

  private markActiveOption(): void {
    const inputEl = this.getInputNative();
    const currentValue =
      inputEl?.getAttribute('data-value') ||
      (inputEl instanceof HTMLInputElement ? inputEl.value : '') ||
      '';

    const options = this.wrapperDiv.querySelectorAll<HTMLElement>(
      '[data-dropdown-option]',
    );
    options.forEach((option) => {
      const value =
        option.getAttribute('data-value')?.trim() ||
        option.getAttribute('value')?.trim() ||
        option.textContent?.trim() ||
        '';
      const label =
        option.getAttribute('data-label')?.trim() ||
        option.textContent?.trim() ||
        '';
      const isActive =
        !!currentValue &&
        (value === currentValue || label === currentValue);

      if (isActive) {
        this.renderer.addClass(option, 'is-active');
        this.renderer.setAttribute(option, 'aria-selected', 'true');
      } else {
        this.renderer.removeClass(option, 'is-active');
        this.renderer.setAttribute(option, 'aria-selected', 'false');
      }
    });
  }

  private setTriggerOpenState(open: boolean): void {
    const inputEl = this.getInputNative();
    if (!inputEl) return;
    this.renderer.setAttribute(inputEl, 'aria-expanded', String(open));
    if (open) {
      this.renderer.addClass(inputEl, 'app-dropdown-open');
    } else {
      this.renderer.removeClass(inputEl, 'app-dropdown-open');
    }
  }

  private onScroll(): void {
    if (this.isOpen && !this.isMobile) {
      this.setPosition();
    }
  }

  private setPosition(): void {
    const inputEl = this.getInputNative();
    if (!inputEl || this.isMobile) return;

    const rect = inputEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const gap = 8;
    const willPositionAbove =
      spaceBelow < this.dropdownHeight + gap && spaceAbove > spaceBelow;

    const top = willPositionAbove
      ? rect.top - this.dropdownHeight - gap
      : rect.bottom + gap;

    this.renderer.setStyle(this.wrapperDiv, 'position', 'fixed');
    this.renderer.setStyle(this.wrapperDiv, 'top', `${Math.max(8, top)}px`);
    this.renderer.setStyle(this.wrapperDiv, 'left', `${rect.left}px`);
    this.renderer.setStyle(this.wrapperDiv, 'right', 'auto');
    this.renderer.setStyle(this.wrapperDiv, 'bottom', 'auto');

    if (this.dropdownWidth === 'parent') {
      this.renderer.setStyle(this.wrapperDiv, 'width', `${rect.width}px`);
    } else {
      this.wrapperDiv.classList.add(this.dropdownWidth);
    }
  }

  private setMobileOrDesktopClasses(): void {
    this.wrapperDiv.classList.remove(
      ...this.mobileClasses,
      ...this.desktopClasses,
    );
    if (this.isMobile) {
      this.wrapperDiv.classList.add(...this.mobileClasses);
      this.renderer.setStyle(this.wrapperDiv, 'left', '0');
      this.renderer.setStyle(this.wrapperDiv, 'right', '0');
      this.renderer.setStyle(this.wrapperDiv, 'top', 'auto');
      this.renderer.setStyle(this.wrapperDiv, 'bottom', '0');
      this.renderer.setStyle(this.wrapperDiv, 'width', '100%');
    } else {
      this.wrapperDiv.classList.add(...this.desktopClasses);
    }
  }

  private getInputNative(): HTMLElement | null {
    if (!this.inputElement) return null;
    return this.inputElement instanceof ElementRef
      ? this.inputElement.nativeElement
      : this.inputElement;
  }
}
