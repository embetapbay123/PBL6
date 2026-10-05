import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  ApiClient({String? baseUrl, FlutterSecureStorage? storage, Dio? customDio})
    : _storage = storage ?? const FlutterSecureStorage(),
      dio =
          customDio ??
          Dio(
            BaseOptions(
              baseUrl:
                  baseUrl ??
                  const String.fromEnvironment(
                    'API_BASE_URL',
                    defaultValue: 'http://10.0.2.2:8080/api/v1',
                  ),
              connectTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 10),
            ),
          );

  final Dio dio;
  final FlutterSecureStorage _storage;
  String? _accessToken;
  Future<void>? _refreshing;

  bool get isAuthenticated => _accessToken != null;

  void setAccessTokenForTesting(String? token) {
    _accessToken = token;
  }

  Future<bool> tryRestoreSession() async {
    try {
      final token = await _storage.read(key: 'refresh_token');
      if (token == null || token.isEmpty) return false;
      await _refresh();
      return _accessToken != null;
    } catch (_) {
      await _storage.delete(key: 'refresh_token');
      _accessToken = null;
      return false;
    }
  }

  Future<void> _saveTokens(Map<String, dynamic> tokens) async {
    _accessToken = tokens['access_token'] as String?;
    final refresh = tokens['refresh_token'] as String?;
    if (refresh != null && refresh.isNotEmpty) {
      await _storage.write(key: 'refresh_token', value: refresh);
    }
  }

  Future<void> _refresh() async {
    final token = await _storage.read(key: 'refresh_token');
    if (token == null || token.isEmpty) {
      _accessToken = null;
      throw StateError('Vui lòng đăng nhập.');
    }
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/refresh',
      data: {'refresh_token': token},
    );
    if (response.data != null) {
      await _saveTokens(response.data!);
    }
  }

  Options _authOptions() {
    return Options(
      headers: {
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      },
    );
  }

  Future<dynamic> _requestWithRetry(
    Future<Response<dynamic>> Function() makeRequest, {
    bool retry = true,
  }) async {
    try {
      final response = await makeRequest();
      return response.data;
    } on DioException catch (error) {
      if (error.response?.statusCode == 401 && retry) {
        _refreshing ??= _refresh().whenComplete(() => _refreshing = null);
        try {
          await _refreshing;
        } catch (_) {
          _accessToken = null;
          await _storage.delete(key: 'refresh_token');
          rethrow;
        }
        return _requestWithRetry(makeRequest, retry: false);
      }
      rethrow;
    }
  }

  // --- Generic HTTP Methods ---
  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? query,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.get<dynamic>(
        path,
        queryParameters: query,
        options: _authOptions(),
      ),
      retry: retry,
    );
  }

  Future<dynamic> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.post<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: _authOptions(),
      ),
      retry: retry,
    );
  }

  Future<dynamic> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.patch<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: _authOptions(),
      ),
      retry: retry,
    );
  }

  Future<dynamic> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.delete<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: _authOptions(),
      ),
      retry: retry,
    );
  }

  // --- Auth API Endpoints ---
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {
        'email': email.trim(),
        'password': password,
        'client_type': 'MOBILE',
      },
    );
    final data = response.data!;
    await _saveTokens(data);
    return data;
  }

  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String displayName,
    String? phone,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/register',
      data: {
        'email': email.trim(),
        'password': password,
        'display_name': displayName.trim(),
      },
    );
    return response.data!;
  }

  Future<Map<String, dynamic>> verifyEmail(String token) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/verify-email',
      data: {'token': token.trim()},
    );
    return response.data ?? {'message': 'Xác minh email thành công.'};
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/reset-password',
      data: {'email': email.trim()},
    );
    return response.data ?? {'message': 'Đã gửi liên kết đặt lại mật khẩu.'};
  }

  Future<Map<String, dynamic>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/reset-password/confirm',
      data: {'token': token.trim(), 'new_password': newPassword},
    );
    return response.data ?? {'message': 'Đặt lại mật khẩu thành công.'};
  }

  Future<Map<String, dynamic>> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    final res = await post(
      '/auth/change-password',
      data: {'current_password': oldPassword, 'new_password': newPassword},
    );
    return (res is Map<String, dynamic>)
        ? res
        : {'message': 'Đổi mật khẩu thành công.'};
  }

  Future<void> logout() async {
    final token = await _storage.read(key: 'refresh_token');
    try {
      if (token != null && token.isNotEmpty) {
        await dio.post('/auth/logout', data: {'refresh_token': token});
      }
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      _accessToken = null;
      await _storage.delete(key: 'refresh_token');
    }
  }

  // --- Profile & Address Endpoints ---
  Future<Map<String, dynamic>> getProfile() async {
    final res = await get('/me');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> updateProfile({
    String? displayName,
    String? phone,
    String? avatarUrl,
  }) async {
    final body = <String, dynamic>{
      if (displayName != null) 'display_name': displayName.trim(),
      if (phone != null) 'phone': phone.trim(),
    };
    final res = await patch('/me', data: body);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<List<Map<String, dynamic>>> getAddresses() async {
    final res = await get('/me/addresses');
    if (res is Map && res['items'] is List) {
      return (res['items'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    if (res is List) {
      return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  Future<Map<String, dynamic>> createAddress(Map<String, dynamic> data) async {
    final res = await post('/me/addresses', data: data);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> updateAddress(
    String id,
    Map<String, dynamic> data,
  ) async {
    final res = await patch('/me/addresses/$id', data: data);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<void> deleteAddress(String id) async {
    await delete('/me/addresses/$id');
  }

  Future<Map<String, dynamic>> setDefaultAddress(String id) async {
    final res = await patch('/me/addresses/$id', data: {'is_default': true});
    return Map<String, dynamic>.from(res as Map);
  }

  // --- Catalog & Products Endpoints (MOB-02) ---
  Future<Map<String, dynamic>> getProducts({
    String? q,
    String? categoryId,
    int page = 1,
    int size = 20,
  }) async {
    final query = <String, dynamic>{
      'page': page,
      'size': size,
      if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
    };
    if (categoryId != null) query['category_id'] = categoryId;
    final res = await get('/products', query: query);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> getProduct(String id) async {
    final res = await get('/products/$id');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<List<Map<String, dynamic>>> getCategories({
    int page = 1,
    int size = 50,
  }) async {
    try {
      final res = await get('/categories', query: {'page': page, 'size': size});
      if (res is Map && res['items'] is List) {
        return (res['items'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
      if (res is List) {
        return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {
      // Return empty list if categories endpoint is unavailable
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> getProductReviews(
    String productId, {
    int page = 1,
    int size = 20,
  }) async {
    try {
      final res = await get(
        '/products/$productId/reviews',
        query: {'page': page, 'size': size},
      );
      if (res is Map && res['items'] is List) {
        return (res['items'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    } catch (_) {
      // Return empty list if reviews are not found or unavailable
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> getRelatedProducts(
    String productId, {
    int page = 1,
    int size = 10,
  }) async {
    try {
      final res = await get(
        '/products/$productId/related',
        query: {'page': page, 'size': size},
      );
      if (res is Map && res['items'] is List) {
        return (res['items'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    } catch (_) {
      // Fallback to empty if endpoint not yet ready
    }
    return [];
  }

  Future<Map<String, dynamic>> getRecommendations() async {
    final res = await get('/recommendations/for-you');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> getPersonalizationConsent() async {
    final res = await get('/me/personalization-consent');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> updatePersonalizationConsent(
    String status,
    int expectedVersion,
  ) async {
    final res = await patch(
      '/me/personalization-consent',
      data: {'status': status, 'expected_version': expectedVersion},
    );
    return Map<String, dynamic>.from(res as Map);
  }

  // --- Cart & Checkout Endpoints (MOB-03) ---
  Future<Map<String, dynamic>> getCartItems({
    int page = 1,
    int size = 50,
  }) async {
    final res = Map<String, dynamic>.from(
      await get('/cart/items', query: {'page': page, 'size': size}) as Map,
    );
    final products = <String, Future<Map<String, dynamic>>>{};
    final items = await Future.wait(
      (res['items'] as List).map((raw) async {
        final item = Map<String, dynamic>.from(raw as Map);
        try {
          final productId = item['product_id'] as String?;
          if (productId == null) {
            throw const FormatException('Cart cũ cần xóa và thêm lại Product.');
          }
          final product = await products.putIfAbsent(
            productId,
            () => getProduct(productId),
          );
          final variant = (product['variants'] as List).cast<Map>().firstWhere(
            (v) => v['id'] == item['variant_id'],
          );
          final price = variant['price_vnd'];
          if (product['store_id'] != item['store_id'] ||
              price is! int ||
              price < 0 ||
              price > 9007199254740991) {
            throw const FormatException('Catalog thiếu giá hoặc sai Store.');
          }
          item.addAll({
            'title': product['title'],
            'sku': variant['sku'],
            'unit_price_vnd': price,
            'catalog_available': true,
          });
        } catch (_) {
          item['catalog_available'] = false;
          item['catalog_error'] =
              'Không lấy được giá hiện tại. Thử làm mới; item cũ cần xóa và thêm lại.';
        }
        return item;
      }),
    );
    return {...res, 'items': items};
  }

  Future<Map<String, dynamic>> addCartItem({
    required String variantId,
    required String productId,
    int quantity = 1,
  }) async {
    final res = await post(
      '/cart/items',
      data: {
        'variant_id': variantId,
        'product_id': productId,
        'quantity': quantity,
      },
    );
    return (res is Map)
        ? Map<String, dynamic>.from(res)
        : {'status': 'success'};
  }

  Future<Map<String, dynamic>> addToCart({
    required String variantId,
    required String productId,
    int quantity = 1,
  }) async {
    return addCartItem(
      variantId: variantId,
      productId: productId,
      quantity: quantity,
    );
  }

  Future<Map<String, dynamic>> updateCartItem(
    String id, {
    required int quantity,
  }) async {
    final res = await patch('/cart/items/$id', data: {'quantity': quantity});
    return Map<String, dynamic>.from(res as Map);
  }

  Future<void> removeCartItem(String id) async {
    await delete('/cart/items/$id');
  }

  Future<Map<String, dynamic>> quoteCheckout({
    required List<String> cartItemIds,
    required String addressId,
    Map<String, String>? paymentMethods,
    Map<String, String>? storeVouchers,
    String? platformVoucherCode,
  }) async {
    final body = <String, dynamic>{
      'cart_item_ids': cartItemIds,
      'address_id': addressId,
      if (paymentMethods != null && paymentMethods.isNotEmpty)
        'payment_methods': paymentMethods,
      if (storeVouchers != null && storeVouchers.isNotEmpty)
        'store_vouchers': storeVouchers,
      if (platformVoucherCode != null && platformVoucherCode.trim().isNotEmpty)
        'platform_voucher_code': platformVoucherCode.trim(),
    };
    final res = await post('/checkout/quotes', data: body);
    return Map<String, dynamic>.from(res as Map);
  }

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
    final body = <String, dynamic>{
      'cart_item_ids': cartItemIds,
      'address_id': addressId,
      'payment_methods': paymentMethods,
      if (storeVouchers != null && storeVouchers.isNotEmpty)
        'store_vouchers': storeVouchers,
      if (platformVoucherCode != null && platformVoucherCode.trim().isNotEmpty)
        'platform_voucher_code': platformVoucherCode.trim(),
      'quote_id': quoteId,
      'expected_payable_total_vnd': expectedPayableTotalVnd,
    };

    final response = await _requestWithRetry(
      () => dio.post<dynamic>(
        '/orders/batches',
        data: body,
        options: Options(
          headers: {
            if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
            'Idempotency-Key': idempotencyKey,
          },
        ),
      ),
    );
    return Map<String, dynamic>.from(response as Map);
  }

  Future<Map<String, dynamic>> getPurchaseGroupOrders(String batchId) async {
    final res = await get('/orders/batches/$batchId');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> validateVouchers({
    required List<String> codes,
    required List<Map<String, dynamic>> items,
  }) async {
    final res = await post(
      '/vouchers/validate',
      data: {'codes': codes, 'items': items},
    );
    return (res is Map) ? Map<String, dynamic>.from(res) : {};
  }
}
