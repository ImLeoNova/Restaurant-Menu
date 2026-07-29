export class User {
  user_ID: string;
  username: string;
  password: string;
  email: string;
  role: string;
  conversation_history: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address?: string;
  national_id?: string;
  avatar?: string;
  profile_completed?: boolean;

  constructor(
    user_ID: string,
    username: string,
    password: string,
    email: string,
    role: string,
    conversation_history: string,
  ) {
    this.user_ID = user_ID;
    this.username = username;
    this.password = password;
    this.email = email;
    this.role = role;
    this.conversation_history = conversation_history;
  }
}
