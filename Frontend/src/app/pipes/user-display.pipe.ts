import { Pipe, PipeTransform } from '@angular/core';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

const PLACEHOLDER_EMAIL_SUFFIX = '@phone.local';

export function isPlaceholderEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith(PLACEHOLDER_EMAIL_SUFFIX);
}

export function formatPhoneNumber(phone: string): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('0') ? `+98${trimmed.slice(1)}` : trimmed;
}

/** Shows the verified phone number instead of the internal phone.local placeholder email. */
@Pipe({ name: 'userContact', standalone: true })
export class UserContactPipe implements PipeTransform {
  transform(user: Pick<User, 'email' | 'phone_number'> | null | undefined): string {
    if (!user) return '';
    if (user.phone_number && isPlaceholderEmail(user.email)) {
      return formatPhoneNumber(user.phone_number);
    }
    return user.email || '';
  }
}

/** Builds the uploaded-avatar URL, or null when the user has no avatar (caller shows a default). */
@Pipe({ name: 'userAvatar', standalone: true })
export class UserAvatarPipe implements PipeTransform {
  transform(user: Pick<User, 'avatar' | 'user_ID'> | null | undefined): string | null {
    if (!user?.avatar || !user?.user_ID) return null;
    return `${environment.websiteAPI}/api/user/avatar/${user.user_ID}`;
  }
}
