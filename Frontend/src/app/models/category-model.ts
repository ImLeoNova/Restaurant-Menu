export class CategoryMODEL {
  category_ID?: number;
  title: string;
  category: string;
  image: string;
  product_count?: number;
  slug?: string;

  constructor(
    title: string = '',
    category: string = '',
    image: string = '',
    category_ID?: number,
    product_count: number = 0,
  ) {
    this.title = title;
    this.category = category;
    this.image = image;
    this.category_ID = category_ID;
    this.product_count = product_count;
    this.slug = category;
  }
}
