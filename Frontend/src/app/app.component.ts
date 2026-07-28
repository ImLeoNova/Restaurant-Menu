import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LoaderComponent } from './components/loader/loader.component';
import { routeAnimations } from './animations/route-animations';
import { filter, Subscription } from 'rxjs';
import { LoaderService } from './services/loader.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  animations: [routeAnimations],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Restaurant-menu';
  private isMobile = false;
  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.updateDevice();

    this.routerSub = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => {
        window.scrollTo(0, 0);
        this.loaderService.reset();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateDevice();
  }

  prepareRoute(outlet: RouterOutlet): string {
    if (!outlet?.isActivated) {
      return this.isMobile ? 'm-void' : 'd-void';
    }

    let route = outlet.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const page =
      route.snapshot.data['animation'] ??
      route.snapshot.routeConfig?.path ??
      'page';

    return `${this.isMobile ? 'm' : 'd'}-${page}`;
  }

  private updateDevice(): void {
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
  }
}
