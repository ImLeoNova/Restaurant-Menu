import {
  animate,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';

const pageLayer = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  minHeight: '100vh',
});

const desktopSlide = [
  query(':enter, :leave', [pageLayer], { optional: true }),
  query(':leave', [style({ zIndex: 1 })], { optional: true }),
  query(':enter', [style({ transform: 'translateX(70%)', zIndex: 2 })], {
    optional: true,
  }),
  group([
    query(
      ':leave',
      [animate('700ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(-30%)' }))],
      { optional: true },
    ),
    query(
      ':enter',
      [animate('700ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)' }))],
      { optional: true },
    ),
  ]),
];

const mobileSlide = [
  query(':enter, :leave', [pageLayer], { optional: true }),
  query(':leave', [style({ zIndex: 1 })], { optional: true }),
  query(
    ':enter',
    [style({ transform: 'translateY(-100%)', opacity: 1, zIndex: 2 })],
    { optional: true },
  ),
  group([
    query(
      ':leave',
      [
        animate(
          '550ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ transform: 'translateY(40%)', opacity: 0 }),
        ),
      ],
      { optional: true },
    ),
    query(
      ':enter',
      [
        animate(
          '550ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ transform: 'translateY(0)', opacity: 1 }),
        ),
      ],
      { optional: true },
    ),
  ]),
];

export const routeAnimations = trigger('routeAnimations', [
  transition((fromState, toState) => isDeviceTransition(fromState, toState, 'd'), desktopSlide),
  transition((fromState, toState) => isDeviceTransition(fromState, toState, 'm'), mobileSlide),
]);

function isDeviceTransition(
  fromState: string,
  toState: string,
  prefix: 'd' | 'm',
): boolean {
  if (!fromState || !toState || fromState === toState) {
    return false;
  }

  return fromState.startsWith(`${prefix}-`) && toState.startsWith(`${prefix}-`);
}
