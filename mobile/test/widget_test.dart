import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pbl6_mobile/main.dart';
void main() {
  testWidgets('Pending screens disclose unfinished behavior', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: PendingPage('Cart')));
    expect(find.text('Khung module — nghiệp vụ chờ Hoa triển khai.'), findsOneWidget);
  });
  test('Useful unauthenticated message', () {
    expect(errorMessage(StateError('Vui lòng đăng nhập.')), contains('Vui lòng đăng nhập'));
  });
}
