import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pbl6_mobile/core/api_client.dart';

class RecordingAdapter implements HttpClientAdapter {
  RecordingAdapter(this.respond);
  final ResponseBody Function(RequestOptions) respond;
  final requests = <RequestOptions>[];
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return respond(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody jsonResponse(Map<String, dynamic> data, [int status = 200]) =>
    ResponseBody.fromString(
      jsonEncode(data),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late RecordingAdapter adapter;
  late ApiClient client;
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    adapter = RecordingAdapter(
      (_) =>
          jsonResponse({'id': 'address', 'status': 'WITHDRAWN', 'version': 2}),
    );
    final dio = Dio(BaseOptions(baseUrl: 'http://example.invalid/api/v1'));
    dio.httpClientAdapter = adapter;
    client = ApiClient(customDio: dio);
  });
  test(
    'Cart loads every page instead of silently hiding items after the first page',
    () async {
      final adapter = RecordingAdapter((request) {
        final page = request.queryParameters['page'] as int;
        return jsonResponse({
          'items': List.generate(
            page == 1 ? 100 : 1,
            (i) => {
              'id': 'item-${page == 1 ? i : 100}',
              'variant_id': 'variant',
              'store_id': 'store',
              'quantity': 1,
            },
          ),
          'total': 101,
          'page': page,
          'size': 100,
        });
      });
      client.dio.httpClientAdapter = adapter;
      final cart = await client.getAllCartItems();
      expect(cart['items'], hasLength(101));
      expect(cart['loaded_pages'], 2);
      expect(adapter.requests.map((r) => r.queryParameters['page']), [1, 2]);
    },
  );
  for (final status in [401, 503]) {
    test(
      'restore refresh $status only deletes credentials when the session is rejected',
      () async {
        FlutterSecureStorage.setMockInitialValues({
          'refresh_token': 'saved-refresh',
        });
        client.dio.httpClientAdapter = RecordingAdapter(
          (_) => jsonResponse({'code': 'REFRESH_ERROR'}, status),
        );
        expect(await client.tryRestoreSession(), false);
        expect(
          await const FlutterSecureStorage().read(key: 'refresh_token'),
          status == 401 ? null : 'saved-refresh',
        );
      },
    );
  }
  test(
    'a transient refresh failure retains the refresh token for a later retry',
    () async {
      FlutterSecureStorage.setMockInitialValues({
        'refresh_token': 'saved-refresh',
      });
      client.setAccessTokenForTesting('expired-access');
      client.dio.httpClientAdapter = RecordingAdapter(
        (request) => jsonResponse({
          'code': 'UNAVAILABLE',
        }, request.path == '/auth/refresh' ? 503 : 401),
      );
      await expectLater(client.getProfile(), throwsA(isA<DioException>()));
      expect(
        await const FlutterSecureStorage().read(key: 'refresh_token'),
        'saved-refresh',
      );
    },
  );
  test(
    'Cart loads the real Catalog price and marks unavailable mappings without inventing a price',
    () async {
      adapter = RecordingAdapter((options) {
        if (options.path == '/cart/items') {
          return jsonResponse({
            'items': [
              {
                'id': 'new',
                'product_id': 'product',
                'variant_id': 'variant',
                'store_id': 'store',
                'quantity': 2,
              },
              {
                'id': 'legacy',
                'variant_id': 'unknown',
                'store_id': 'store',
                'quantity': 1,
              },
            ],
            'total': 2,
            'page': 1,
            'size': 50,
          });
        }
        return jsonResponse({
          'id': 'product',
          'store_id': 'store',
          'title': 'Real Product',
          'variants': [
            {'id': 'variant', 'sku': 'SKU', 'price_vnd': 42000},
          ],
        });
      });
      final dio = Dio(BaseOptions(baseUrl: 'http://example.invalid/api/v1'));
      dio.httpClientAdapter = adapter;
      client = ApiClient(customDio: dio);
      final items = (await client.getCartItems())['items'] as List;
      expect(items[0]['unit_price_vnd'], 42000);
      expect(items[0]['catalog_available'], true);
      expect(items[1]['catalog_available'], false);
      expect(items[1].containsKey('unit_price_vnd'), false);
      expect(
        adapter.requests.where((r) => r.path == '/products/product'),
        hasLength(1),
      );
    },
  );
  test('password endpoints and request keys match OpenAPI', () async {
    await client.forgotPassword('a@example.test');
    expect(adapter.requests.last.path, '/auth/reset-password');
    expect(adapter.requests.last.data, {'email': 'a@example.test'});
    await client.resetPassword(token: 'token', newPassword: 'New-password-1');
    expect(adapter.requests.last.path, '/auth/reset-password/confirm');
    expect(adapter.requests.last.data, {
      'token': 'token',
      'new_password': 'New-password-1',
    });
    await client.changePassword(
      oldPassword: 'Old-password-1',
      newPassword: 'New-password-1',
    );
    expect(adapter.requests.last.data, {
      'current_password': 'Old-password-1',
      'new_password': 'New-password-1',
    });
  });
  test(
    'register does not send unsupported phone and profile does not send avatar_url',
    () async {
      await client.register(
        email: 'a@example.test',
        password: 'Password-1',
        displayName: 'User',
        phone: '0900000000',
      );
      expect((adapter.requests.last.data as Map).keys.toSet(), {
        'email',
        'password',
        'display_name',
      });
      await client.updateProfile(
        displayName: 'User',
        avatarUrl: 'https://example.invalid/avatar',
      );
      expect(adapter.requests.last.data, {'display_name': 'User'});
    },
  );
  test('default Address uses the update operation', () async {
    await client.setDefaultAddress('address');
    expect(adapter.requests.last.path, '/me/addresses/address');
    expect(adapter.requests.last.method, 'PATCH');
    expect(adapter.requests.last.data, {'is_default': true});
  });
  test('consent reads and updates the real endpoint', () async {
    final consent = await client.getPersonalizationConsent();
    expect(adapter.requests.last.path, '/me/personalization-consent');
    expect(consent['status'], 'WITHDRAWN');
    await client.updatePersonalizationConsent('GRANTED', 2);
    expect(adapter.requests.last.path, '/me/personalization-consent');
    expect(adapter.requests.last.data, {
      'status': 'GRANTED',
      'expected_version': 2,
    });
  });
  test(
    'consent and recommendation errors propagate without granting consent or generating fixtures',
    () async {
      adapter = RecordingAdapter(
        (_) => jsonResponse({'code': 'DEPENDENCY_UNAVAILABLE'}, 503),
      );
      client.dio.httpClientAdapter = adapter;
      await expectLater(
        client.getPersonalizationConsent(),
        throwsA(isA<DioException>()),
      );
      await expectLater(
        client.getRecommendations(),
        throwsA(isA<DioException>()),
      );
    },
  );
  test(
    'Cart includes Product mapping and Catalog forwards filter/page',
    () async {
      await client.addToCart(
        productId: 'product',
        variantId: 'variant',
        quantity: 2,
      );
      expect(adapter.requests.last.data, {
        'product_id': 'product',
        'variant_id': 'variant',
        'quantity': 2,
      });
      await client.getProducts(q: 'keyboard', categoryId: 'category', page: 2);
      expect(adapter.requests.last.queryParameters, {
        'q': 'keyboard',
        'category_id': 'category',
        'page': 2,
        'size': 20,
      });
    },
  );
  test(
    'a business error after successful refresh preserves the new session',
    () async {
      FlutterSecureStorage.setMockInitialValues({
        'refresh_token': 'old-refresh',
      });
      client.setAccessTokenForTesting('expired-access');
      int protectedCalls = 0;
      adapter = RecordingAdapter((request) {
        if (request.path == '/auth/refresh') {
          return jsonResponse({
            'access_token': 'new-access',
            'refresh_token': 'new-refresh',
          });
        }
        protectedCalls++;
        return jsonResponse({
          'code': protectedCalls == 1 ? 'UNAUTHENTICATED' : 'VALIDATION_FAILED',
        }, protectedCalls == 1 ? 401 : 422);
      });
      client.dio.httpClientAdapter = adapter;
      await expectLater(
        client.updateProfile(displayName: 'User'),
        throwsA(isA<DioException>()),
      );
      expect(client.isAuthenticated, isTrue);
      expect(
        await const FlutterSecureStorage().read(key: 'refresh_token'),
        'new-refresh',
      );
      expect(
        adapter.requests.last.headers['Authorization'],
        'Bearer new-access',
      );
    },
  );
}
