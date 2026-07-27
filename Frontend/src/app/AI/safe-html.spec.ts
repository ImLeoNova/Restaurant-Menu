// import { sanitizeHtml } from './safe-html';

// describe('sanitizeHtml', () => {
//   it('removes unsafe tags and attributes while keeping safe markup', () => {
//     const input = `
//       <div class="card">
//         <p>سلام دنیا</p>
//         <img src="https://example.com/pic.png" alt="sample" onerror="alert(1)">
//         ![برگر](https://example.com/burger.png "برگر ویژه")
//         https://example.com/plate.jpg
//         <script>alert('xss')</script>
//         <a href="javascript:alert(1)">لینک خطرناک</a>
//         <a href="/products">لینک امن</a>
//       </div>
//     `;

//     const output = sanitizeHtml(input);

//     expect(output).toContain('<div class="card">');
//     expect(output).toContain('<p>سلام دنیا</p>');
//     expect(output).toContain('<img');
//     expect(output).toContain('alt="sample"');
//     expect(output).toContain('src="https://example.com/pic.png"');
//     expect(output).toContain('src="https://example.com/burger.png"');
//     expect(output).toContain('alt="برگر"');
//     expect(output).toContain('title="برگر ویژه"');
//     expect(output).toContain('src="https://example.com/plate.jpg"');
//     expect(output).not.toContain('<script');
//     expect(output).not.toContain('onerror');
//     expect(output).not.toContain('javascript:');
//     expect(output).toContain('href="/products"');
//   });
// });
