import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Chart.js is loaded dynamically so the app still builds if the package
// hasn't been installed yet. Run: npm install chart.js
declare const Chart: any;

@Component({
  selector: 'app-base-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full" [style.height]="height">
      <canvas #canvas></canvas>
    </div>
  `,
})
export class BaseChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() type: 'line' | 'bar' | 'doughnut' | 'pie' = 'line';
  @Input() data: any = { labels: [], datasets: [] };
  @Input() options: any = {};
  @Input() height = '260px';

  private chart: any = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && (changes['data'] || changes['type'] || changes['options'])) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private async ensureChartJs(): Promise<boolean> {
    if (typeof (window as any).Chart !== 'undefined') return true;
    try {
      // Resolved after `npm install chart.js`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import('chart.js');
      const ChartLib = mod.Chart || mod.default || mod;
      if (mod.registerables) {
        ChartLib.register(...mod.registerables);
      }
      (window as any).Chart = ChartLib;
      return true;
    } catch {
      console.warn('[BaseChart] chart.js not found. Run: npm install chart.js');
      return false;
    }
  }

  private async render(): Promise<void> {
    const ok = await this.ensureChartJs();
    if (!ok || !this.canvasRef?.nativeElement) return;

    this.destroyChart();

    const rtlDefaults = {
      plugins: {
        legend: {
          rtl: true,
          textDirection: 'rtl',
          labels: { font: { family: 'Yekan, Tahoma, sans-serif' } },
        },
        tooltip: {
          rtl: true,
          textDirection: 'rtl',
          titleFont: { family: 'Yekan, Tahoma, sans-serif' },
          bodyFont: { family: 'Yekan, Tahoma, sans-serif' },
        },
      },
    };

    const mergedOptions = this.deepMerge(rtlDefaults, this.options || {});

    const ChartCtor = (window as any).Chart;
    this.chart = new ChartCtor(this.canvasRef.nativeElement, {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...mergedOptions,
      },
    });
  }

  private deepMerge(target: any, source: any): any {
    const out = { ...target };
    for (const key of Object.keys(source || {})) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        out[key] = this.deepMerge(out[key] || {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }
}
