export interface CommentStats {
  total: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface ProductComment {
  comment_ID: number;
  product_ID: number;
  user_ID: string;
  display_name: string;
  avatar: string | null;
  content: string;
  rating: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductCommentsResponse {
  comments: ProductComment[];
  stats: CommentStats;
}

export interface CreateCommentPayload {
  content: string;
  rating: number;
}

export interface CommentsSummary {
  available: boolean;
  reason?: string;
  min_required?: number;
  cached?: boolean;
  stale?: boolean;
  product_ID?: number;
  summary?: string;
  positives?: string[];
  negatives?: string[];
  comment_count?: number;
  average_rating?: number;
  updated_at?: string | null;
  total?: number;
}
