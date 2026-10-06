import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pbl6_mobile/features/checkout/checkout_page.dart';
import 'package:pbl6_mobile/main.dart';
import 'widget_test.dart' show MockApiClient;

class ControlledCheckout extends MockApiClient {
  final requests = <Completer<Map<String, dynamic>>>[];
  bool addressFails = false;
  bool priceChanged = false;
  final confirmKeys = <String>[];

  @override
  Future<Map<String, dynamic>> confirmCheckout({
    required List<String> cartItemIds,
    required String addressId,
    required Map<String, String> paymentMethods,
    Map<String, String>? storeVouchers,
    String? platformVoucherCode,
    required String quoteId,
    required int expectedPayableTotalVnd,
    required String idempotencyKey,
  }) async {
    confirmKeys.add(idempotencyKey);
    final request = RequestOptions(path: '/orders/batches');
    throw DioException(
      requestOptions: request,
      type: DioExceptionType.badResponse,
      response: Response(
        requestOptions: request,
        statusCode: priceChanged ? 409 : 501,
        data: {
          'code': priceChanged ? 'PRICE_CHANGED' : 'NOT_IMPLEMENTED',
          'message': 'Checkout chưa hoàn thiện.',
        },
      ),
    );
  }

  @override
  Future<List<Map<String, dynamic>>> getAddresses() async {
    if (addressFails) throw StateError('ADDRESS_UNAVAILABLE');
    return [
      {
        'id': 'address',
        'recipient_name': 'Customer',
        'phone': '0900000000',
        'city': 'Hue',
        'line1': 'Address',
      },
    ];
  }

  @override
  Future<Map<String, dynamic>> quoteCheckout({
    required List<String> cartItemIds,
    required String addressId,
    Map<String, String>? paymentMethods,
    Map<String, String>? storeVouchers,
    String? platformVoucherCode,
  }) {
    final request = Completer<Map<String, dynamic>>();
    requests.add(request);
    return request.future;
  }
}

Map<String, dynamic> quote(int amount, {bool expired = false}) => {
  'quote_id': 'quote-$amount',
  'payable_total_vnd': amount,
  'expires_at': DateTime.now()
      .add(Duration(minutes: expired ? -1 : 10))
      .toUtc()
      .toIso8601String(),
  'stores': [
    {
      'store_id': 'store',
      'amounts': {
        'goods_vnd': amount,
        'store_discount_vnd': 0,
        'platform_discount_vnd': 0,
        'shipping_vnd': 0,
        'payable_vnd': amount,
      },
      'items': [
        {
          'product_title': 'Product',
          'sku': 'SKU',
          'unit_price_vnd': amount,
          'quantity': 1,
        },
      ],
    },
  ],
};
Future<void> open(WidgetTester tester, ControlledCheckout client) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [apiProvider.overrideWithValue(client)],
      child: const MaterialApp(
        home: CheckoutPage(
          cartItemIds: ['item'],
          initialSelectedItems: [
            {
              'id': 'item',
              'store_id': 'store',
              'title': 'Product',
              'unit_price_vnd': 100000,
              'quantity': 1,
            },
          ],
        ),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
}

void main() {
  testWidgets(
    'confirm 409 fetches a new quote after releasing the submit guard',
    (tester) async {
      final client = ControlledCheckout()..priceChanged = true;
      await open(tester, client);
      client.requests.single.complete(quote(100000));
      await tester.pump();
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Đặt hàng'));
      await tester.pump();
      await tester.pump();
      expect(client.requests, hasLength(2));
      client.requests.last.complete(quote(150000));
      await tester.pump();
      await tester.pump();
      expect(find.text('150000 ₫'), findsWidgets);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'confirm 501 shows an error and retains the same attempt key on retry',
    (tester) async {
      final client = ControlledCheckout();
      await open(tester, client);
      client.requests.single.complete(quote(100000));
      await tester.pump();
      await tester.pump();
      for (var attempt = 0; attempt < 2; attempt++) {
        await tester.tap(find.widgetWithText(FilledButton, 'Đặt hàng'));
        await tester.pumpAndSettle();
        expect(find.text('Đặt hàng thành công'), findsNothing);
        expect(find.byType(CheckoutPage), findsOneWidget);
      }
      expect(client.confirmKeys, hasLength(2));
      expect(client.confirmKeys[0], client.confirmKeys[1]);
      expect(find.textContaining('Checkout chưa hoàn thiện.'), findsWidgets);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'late old quote cannot replace the quote for the new payment selection',
    (tester) async {
      final client = ControlledCheckout();
      await open(tester, client);
      expect(client.requests.length, 1);
      await tester.scrollUntilVisible(
        find.text('SANDBOX'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('SANDBOX'));
      await tester.pump();
      expect(client.requests.length, 2);
      client.requests[1].complete(quote(150000));
      await tester.pump();
      await tester.pump();
      client.requests[0].complete(quote(100000));
      await tester.pump();
      await tester.pump();
      expect(find.text('150000 ₫'), findsWidgets);
      expect(find.text('100000 ₫'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'expired server quote is rejected without inventing a new expiry',
    (tester) async {
      final client = ControlledCheckout();
      await open(tester, client);
      client.requests.single.complete(quote(100000, expired: true));
      await tester.pump();
      await tester.pump();
      final buttons = tester.widgetList<FilledButton>(
        find.byType(FilledButton),
      );
      expect(buttons.any((b) => b.onPressed == null), true);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'Address failure is shown and can be retried instead of showing an empty list',
    (tester) async {
      final client = ControlledCheckout()..addressFails = true;
      await open(tester, client);
      await tester.scrollUntilVisible(
        find.text('Thử tải lại địa chỉ'),
        150,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining('ADDRESS_UNAVAILABLE'), findsOneWidget);
      client.addressFails = false;
      await tester.tap(find.text('Thử tải lại địa chỉ'));
      await tester.pump();
      await tester.pump();
      expect(client.requests, hasLength(1));
      client.requests.single.complete(quote(100000));
      await tester.pump();
      await tester.pump();
      expect(find.text('Thử tải lại địa chỉ'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
