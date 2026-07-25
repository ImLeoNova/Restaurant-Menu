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
  username: string;
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
