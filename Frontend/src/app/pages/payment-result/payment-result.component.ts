import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './payment-result.component.html',
})
export class PaymentResultComponent implements OnInit {
  success = false;
  orderId: string | null = null;
  refId: string | null = null;
  message = '';

  constructor(private route: ActivatedRoute, private cartService: CartService) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.success = q.get('success') === '1';
    this.orderId = q.get('order_id');
    this.refId = q.get('ref_id');
    const msg = q.get('message') || '';
    if (this.success) {
      this.cartService.clearCart();
      this.message = 'پرداخت با موفقیت انجام شد و سفارش شما ثبت گردید.';
    } else {
      const map: Record<string, string> = {
        cancelled: 'پرداخت توسط شما لغو شد.',
        verify_failed: 'تأیید پرداخت ناموفق بود.',
        intent_not_found: 'درخواست پرداخت یافت نشد یا منقضی شده است.',
        missing_authority: 'اطلاعات پرداخت ناقص است.',
        server_error: 'خطای سرور هنگام تأیید پرداخت رخ داد.',
      };
      this.message = map[msg] || 'پرداخت ناموفق بود.';
    }
  }
}
