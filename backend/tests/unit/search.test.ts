import {searchPattern, searchNormalized, searchRegexPattern} from '../../shared/src/search';
test('Vietnamese search canonicalizes accents, case and Đ without changing display text',()=>{expect(searchPattern(' ĐiỆn thoại ĐỎ ')).toBe('%dien thoai do%');expect(searchPattern('Điện thoại Đỏ'.normalize('NFD'))).toBe('%dien thoai do%');expect(searchPattern(' ')).toBeUndefined();});
test('LIKE control characters are escaped as literal search input',()=>{expect(searchPattern('%_')).toBe('%\\%\\_%');expect(searchPattern('a\\b')).toBe('%a\\\\b%');});
test('searchRegexPattern canonicalizes and escapes regex metacharacters',()=>{
  expect(searchNormalized(' ĐiỆn thoại ĐỎ ')).toBe('dien thoai do');
  expect(searchRegexPattern('áo')).toBe('ao');
  expect(searchRegexPattern(' ĐiỆn thoại (ĐỎ) ')).toBe('dien thoai \\(do\\)');
  expect(searchRegexPattern(' ')).toBeUndefined();
  expect(searchRegexPattern()).toBeUndefined();
});
