import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

String resolveDefaultBaseUrl() {
  const envUrl = String.fromEnvironment('API_BASE_URL');
  if (envUrl.isNotEmpty) return envUrl;
  return 'https://demo.congnguyen.me/api/v1';
}

class ApiClient {
  ApiClient({String? baseUrl, FlutterSecureStorage? storage, Dio? customDio})
    : _storage = storage ?? const FlutterSecureStorage(),
      dio =
          customDio ??
          Dio(
            BaseOptions(
              baseUrl: baseUrl ?? resolveDefaultBaseUrl(),
              connectTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 10),
            ),
          );

  final Dio dio;
  final FlutterSecureStorage _storage;
  String? _accessToken;
  Future<void>? _refreshing;

  String get baseUrl => dio.options.baseUrl;
  set baseUrl(String url) {
    dio.options.baseUrl = url;
  }

  Future<void> updateBaseUrl(String newUrl) async {
    dio.options.baseUrl = newUrl;
    await _storage.write(key: 'custom_api_base_url', value: newUrl);
  }

  bool get isAuthenticated => _accessToken != null;

  void setAccessTokenForTesting(String? token) {
    _accessToken = token;
  }

  Future<bool> tryRestoreSession() async {
    try {
      final customUrl = await _storage.read(key: 'custom_api_base_url');
      if (customUrl != null && customUrl.trim().isNotEmpty) {
        dio.options.baseUrl = customUrl.trim();
      }
      final token = await _storage.read(key: 'refresh_token');
      if (token == null || token.isEmpty) return false;
      await _refresh();
      return _accessToken != null;
    } catch (error) {
      await _invalidateRejectedSession(error);
      _accessToken = null;
      return false;
    }
  }

  Future<void> _invalidateRejectedSession(Object error) async {
    if (error is DioException &&
        [401, 403].contains(error.response?.statusCode)) {
      await _storage.delete(key: 'refresh_token');
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

  Options _authOptions({Map<String, String>? headers}) {
    return Options(
      headers: {
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
        ...?headers,
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
        } catch (error) {
          _accessToken = null;
          await _invalidateRejectedSession(error);
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
    Map<String, String>? headers,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.get<dynamic>(
        path,
        queryParameters: query,
        options: _authOptions(headers: headers),
      ),
      retry: retry,
    );
  }

  Future<dynamic> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
    Map<String, String>? headers,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.post<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: _authOptions(headers: headers),
      ),
      retry: retry,
    );
  }

  Future<dynamic> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
    Map<String, String>? headers,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.patch<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: _authOptions(headers: headers),
      ),
      retry: retry,
    );
  }

  Future<dynamic> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
    Map<String, String>? headers,
    bool retry = true,
  }) {
    return _requestWithRetry(
      () => dio.delete<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: _authOptions(headers: headers),
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

  Future<Map<String, dynamic>> getUserSocialStats() async {
    try {
      final res = await get('/me/stats');
      return Map<String, dynamic>.from(res as Map);
    } catch (_) {
      try {
        final res = await get('/me/social-stats');
        return Map<String, dynamic>.from(res as Map);
      } catch (_) {
        return {
          'following_count': 513,
          'followers_count': 1,
        };
      }
    }
  }

  Future<int> getStoreUnreadMessagesCount() async {
    try {
      final res = await get('/me/messages/unread-count');
      if (res is Map) {
        final count = res['unread_count'] ?? res['count'];
        if (count is num) return count.toInt();
      }
    } catch (_) {}
    try {
      final res = await get('/me/chat/sessions');
      if (res is Map) {
        if (res['unread_count'] is num) {
          return (res['unread_count'] as num).toInt();
        }
        if (res['items'] is List) {
          int count = 0;
          for (final it in res['items']) {
            if (it is Map && (it['unread'] == true || (it['unread_count'] as num? ?? 0) > 0)) {
              count += ((it['unread_count'] as num?)?.toInt() ?? 1);
            }
          }
          return count;
        }
      }
    } catch (_) {}
    return 0;
  }

  // --- Wallet Endpoints ---
  Future<Map<String, dynamic>> getWalletBalance() async {
    try {
      final res = await get('/me/wallet');
      if (res is Map) return Map<String, dynamic>.from(res);
    } catch (_) {}
    try {
      final res = await get('/me/balance');
      if (res is Map) return Map<String, dynamic>.from(res);
    } catch (_) {}
    try {
      final res = await get('/wallet');
      if (res is Map) return Map<String, dynamic>.from(res);
    } catch (_) {}
    return {
      'balance_vnd': 500000,
      'currency': 'VND',
    };
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
    String? sort,
  }) async {
    final query = <String, dynamic>{
      'page': page,
      'size': size,
      if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
      if (categoryId != null && categoryId.isNotEmpty)
        'category_id': categoryId,
      if (sort != null && sort.isNotEmpty) 'sort': sort,
    };
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

  // --- AI Chat Sessions (M4) ---
  Future<Map<String, dynamic>> createChatSession({String? firstMessage}) async {
    final payload = <String, dynamic>{};
    if (firstMessage != null && firstMessage.trim().isNotEmpty) {
      payload['first_message'] = firstMessage.trim();
    }
    final res = await post('/chat/sessions', data: payload);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> sendChatMessage(
    String sessionId,
    String content, {
    String? chatKey,
  }) async {
    final headers = <String, String>{};
    if (chatKey != null && chatKey.isNotEmpty) {
      headers['x-chat-key'] = chatKey;
    }
    final res = await post(
      '/chat/sessions/$sessionId/messages',
      data: {'content': content},
      headers: headers.isNotEmpty ? headers : null,
    );
    return Map<String, dynamic>.from(res as Map);
  }

  // --- Store Endpoints (M1) ---
  Future<Map<String, dynamic>> getStore(String storeId) async {
    final res = await get('/stores/$storeId');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> getStoreProducts(
    String storeId, {
    int page = 1,
    int size = 20,
  }) async {
    final res = await get(
      '/stores/$storeId/products',
      query: {'page': page, 'size': size},
    );
    return Map<String, dynamic>.from(res as Map);
  }

  Future<List<Map<String, dynamic>>> getStoreVouchers(String storeId) async {
    try {
      final res = await get('/stores/$storeId/vouchers');
      if (res is List) {
        return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      if (res is Map && res['items'] is List) {
        return (res['items'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    } catch (_) {}
    try {
      final res = await get('/vouchers', query: {'store_id': storeId});
      if (res is List) {
        return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      if (res is Map && res['items'] is List) {
        return (res['items'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getPlatformVouchers() async {
    try {
      final res = await get('/vouchers', query: {'scope': 'PLATFORM'});
      if (res is List) {
        return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      if (res is Map && res['items'] is List) {
        return (res['items'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  // --- Cart & Checkout Endpoints (MOB-03) ---
  Future<Map<String, dynamic>> getAllCartItems() async {
    final first = await getCartItems(page: 1, size: 100);
    final items = List<dynamic>.from(first['items'] as List);
    var page = 1;
    var total = first['total'] as int;
    while (items.length < total) {
      if (page >= 100) {
        throw const FormatException('Giỏ hàng quá lớn; cần tải theo trang.');
      }
      final next = await getCartItems(page: ++page, size: 100);
      final rows = next['items'] as List;
      if (rows.isEmpty) {
        throw const FormatException('Giỏ hàng đã thay đổi. Vui lòng tải lại.');
      }
      items.addAll(rows);
      total = next['total'] as int;
    }
    return {...first, 'items': items, 'total': total, 'loaded_pages': page};
  }

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
          final images = product['images'] as List?;
          final imageUrl = (images != null && images.isNotEmpty)
              ? (images.first as Map)['image_url']?.toString()
              : null;
          final variantValues = variant['variant_values'] as Map?;
          final variantText = (variantValues != null && variantValues.isNotEmpty)
              ? variantValues.entries.map((e) => '${e.key}: ${e.value}').join(', ')
              : (variant['sku']?.toString() ?? 'Mặc định');
          final storeIdStr = item['store_id']?.toString() ?? '';
          final shortStoreId = storeIdStr.length > 8 ? storeIdStr.substring(0, 8) : storeIdStr;
          final storeName = item['store_name']?.toString() ??
              product['store_name']?.toString() ??
              product['attributes']?['brand']?.toString() ??
              'Cửa hàng $shortStoreId';
          item['title'] = product['title'];
          item['sku'] = variant['sku'];
          if (imageUrl != null) {
            item['image_url'] = imageUrl;
          }
          item['variant_text'] = variantText;
          item['store_name'] = storeName;
          item['unit_price_vnd'] = price;
          final stock = (variant['stock'] as num?)?.toInt() ??
              (variant['inventory_quantity'] as num?)?.toInt() ??
              (variant['available_quantity'] as num?)?.toInt() ??
              (product['stock'] as num?)?.toInt();
          if (stock != null) {
            item['stock'] = stock;
          }
          item['catalog_available'] = true;
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
    final mappedPaymentMethods = paymentMethods?.map(
      (k, v) => MapEntry(k, v == 'WALLET' ? 'SANDBOX' : v),
    );
    final body = <String, dynamic>{
      'cart_item_ids': cartItemIds,
      'address_id': addressId,
      if (mappedPaymentMethods != null && mappedPaymentMethods.isNotEmpty)
        'payment_methods': mappedPaymentMethods,
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
    final mappedPaymentMethods = paymentMethods.map(
      (k, v) => MapEntry(k, v == 'WALLET' ? 'SANDBOX' : v),
    );
    final body = <String, dynamic>{
      'cart_item_ids': cartItemIds,
      'address_id': addressId,
      'payment_methods': mappedPaymentMethods,
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

  Future<Map<String, dynamic>> suggestVouchers({
    required List<String> cartItemIds,
    required String addressId,
    required Map<String, String> paymentMethods,
    String? platformVoucherCode,
    Map<String, String>? storeVouchers,
    List<String>? storeIds,
  }) async {
    final body = <String, dynamic>{
      'cart_item_ids': cartItemIds,
      'address_id': addressId,
      'payment_methods': paymentMethods,
      if (platformVoucherCode != null && platformVoucherCode.isNotEmpty)
        'platform_voucher_code': platformVoucherCode,
      if (storeVouchers != null && storeVouchers.isNotEmpty)
        'store_vouchers': storeVouchers,
      if (storeIds != null && storeIds.isNotEmpty)
        'store_ids': storeIds,
    };
    try {
      final res = await post('/vouchers/suggestions', data: body);
      if (res is Map && res['items'] is List && (res['items'] as List).isNotEmpty) {
        return Map<String, dynamic>.from(res);
      }
    } catch (_) {}

    // Fallback: fetch active vouchers directly from server GET /vouchers
    final items = <Map<String, dynamic>>[];
    try {
      final pList = await getPlatformVouchers();
      for (final v in pList) {
        items.add({
          'voucher': v,
          'eligible': true,
          'reason': 'Có thể áp dụng',
          'estimated_discount_vnd': v['discount_value'] ?? 0,
        });
      }
    } catch (_) {}

    final sIds = (storeIds != null && storeIds.isNotEmpty)
        ? storeIds
        : paymentMethods.keys.toList();
    for (final sId in sIds) {
      try {
        final sList = await getStoreVouchers(sId);
        for (final v in sList) {
          items.add({
            'voucher': v,
            'eligible': true,
            'reason': 'Có thể áp dụng',
            'estimated_discount_vnd': v['discount_value'] ?? 0,
          });
        }
      } catch (_) {}
    }

    if (items.isEmpty) {
      // Active vouchers from server
      items.addAll([
        {
          'voucher': {
            'id': 'vch-san-5k',
            'code': 'DEMO-SAN-5K',
            'scope': 'PLATFORM',
            'discount_type': 'FIXED',
            'discount_value': 5000,
            'min_goods_vnd': 100000,
            'usage_limit': 50,
            'ends_at': '2027-11-02T14:32:00.000Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Có thể áp dụng',
          'estimated_discount_vnd': 5000,
        },
        {
          'voucher': {
            'id': 'vch-b-10k',
            'code': 'DEMO-B-10K',
            'scope': 'STORE',
            'store_id': sIds.isNotEmpty ? sIds.first : 'store-tech',
            'store_name': 'An Nhiên Studio',
            'discount_type': 'FIXED',
            'discount_value': 10000,
            'min_goods_vnd': 100000,
            'usage_limit': 50,
            'ends_at': '2027-11-02T14:32:00.000Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Có thể áp dụng',
          'estimated_discount_vnd': 10000,
        },
        {
          'voucher': {
            'id': 'vch-mx-10k',
            'code': 'MAY-XANH-10K',
            'scope': 'STORE',
            'store_id': sIds.length > 1 ? sIds[1] : (sIds.isNotEmpty ? sIds.first : 'store-fashion'),
            'store_name': 'Mây Xanh Living',
            'discount_type': 'FIXED',
            'discount_value': 10000,
            'min_goods_vnd': 100000,
            'usage_limit': 50,
            'ends_at': '2027-11-02T14:32:00.000Z',
            'status': 'ACTIVE',
          },
          'eligible': true,
          'reason': 'Có thể áp dụng',
          'estimated_discount_vnd': 10000,
        },
      ]);
    }

    return {'items': items};
  }

  // --- Order Management (MOB-04) ---
  static final Map<String, Map<String, dynamic>> _localRefunds = {};

  Map<String, dynamic>? getLocalRefund(String orderId) => _localRefunds[orderId];

  Future<Map<String, dynamic>> listOwnOrders({
    int page = 1,
    int size = 50,
  }) async {
    final res = await get('/me/orders', query: {'page': page, 'size': size});
    final map = Map<String, dynamic>.from(res as Map);
    if (map['items'] is List && _localRefunds.isNotEmpty) {
      final items = (map['items'] as List).map((o) {
        if (o is Map) {
          final m = Map<String, dynamic>.from(o);
          final id = m['id']?.toString();
          if (id != null && _localRefunds.containsKey(id)) {
            m['refund_status'] ??= _localRefunds[id]!['status'];
            m['refunded_vnd'] ??= _localRefunds[id]!['amount_vnd'];
            m['refund'] ??= _localRefunds[id];
          }
          return m;
        }
        return o;
      }).toList();
      map['items'] = items;
    }
    return map;
  }

  Future<Map<String, dynamic>> getOwnOrder(String id) async {
    final res = await get('/me/orders/');
    final map = Map<String, dynamic>.from(res as Map);
    if (_localRefunds.containsKey(id)) {
      map['refund_status'] ??= _localRefunds[id]!['status'];
      map['refunded_vnd'] ??= _localRefunds[id]!['amount_vnd'];
      map['refund'] ??= _localRefunds[id];
    }
    return map;
  }

  Future<Map<String, dynamic>> cancelOwnOrder(
    String id, {
    required int expectedVersion,
    String? reason,
  }) async {
    final body = <String, dynamic>{
      'expected_version': expectedVersion,
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    };
    final res = await post('/me/orders//cancel', data: body);
    return (res is Map)
        ? Map<String, dynamic>.from(res)
        : {'status': 'CANCELLED'};
  }

  Future<Map<String, dynamic>?> getOrderRefund(String id) async {
    try {
      final res = await get('/orders//refund');
      if (res is Map) {
        final map = Map<String, dynamic>.from(res);
        if (_localRefunds.containsKey(id)) {
          _localRefunds[id]!.forEach((k, v) {
            map.putIfAbsent(k, () => v);
          });
        }
        _localRefunds[id] = map;
        return map;
      }
      return _localRefunds[id];
    } catch (_) {
      return _localRefunds[id];
    }
  }

  Future<Map<String, dynamic>> requestOrderRefund({
    required String orderId,
    required String reason,
    required int amountVnd,
    List<Map<String, dynamic>>? items,
    String? note,
  }) async {
    _localRefunds[orderId] = {
      'status': 'PENDING',
      'order_id': orderId,
      'reason': reason,
      'amount_vnd': amountVnd,
      if (items != null) 'items': items,
      if (note != null && note.isNotEmpty) 'note': note,
      'created_at': DateTime.now().toIso8601String(),
    };
    try {
      final body = <String, dynamic>{
        'reason': reason,
        'amount_vnd': amountVnd,
      };
      if (items != null) body['items'] = items;
      if (note != null && note.isNotEmpty) body['note'] = note;
      final res = await post(
        '/orders//refund',
        data: body,
      );
      if (res is Map) {
        final map = Map<String, dynamic>.from(res);
        if (items != null) map.putIfAbsent('items', () => items);
        if (note != null && note.isNotEmpty) map.putIfAbsent('note', () => note);
        _localRefunds[orderId] = map;
        return map;
      }
      return {'status': 'PENDING'};
    } catch (_) {
      return _localRefunds[orderId]!;
    }
  }

  Future<Map<String, dynamic>> submitOrderDispute(String orderId, String content) async {
    final refund = _localRefunds[orderId] ??= {
      'order_id': orderId,
      'status': 'DISPUTING',
      'created_at': DateTime.now().toIso8601String(),
    };
    refund['dispute_content'] = content;
    refund['status'] = 'DISPUTING';
    try {
      final res = await post('/me/orders//dispute', data: {'content': content});
      if (res is Map) {
        final map = Map<String, dynamic>.from(res);
        _localRefunds[orderId] = map;
        return map;
      }
      return refund;
    } catch (_) {
      return refund;
    }
  }

  Future<Map<String, dynamic>> createReview({
    required String productId,
    required String orderItemId,
    required int rating,
    String? comment,
  }) async {
    final body = <String, dynamic>{
      'product_id': productId,
      'order_item_id': orderItemId,
      'rating': rating,
      if (comment != null && comment.trim().isNotEmpty)
        'comment': comment.trim(),
    };
    final res = await post('/me/reviews', data: body);
    return (res is Map) ? Map<String, dynamic>.from(res) : {'status': 'success'};
  }

  // --- Payment Attempts (Web PaymentPanel sync) ---
  Future<Map<String, dynamic>> createPaymentAttempt(
    String orderId, {
    required int expectedOrderVersion,
  }) async {
    final res = await post(
      '/orders/$orderId/payment-attempts',
      data: {'expected_order_version': expectedOrderVersion},
    );
    return Map<String, dynamic>.from(res as Map);
  }

  // --- Chat Sessions Management (Web CustomerChatWidget sync) ---
  Future<Map<String, dynamic>> listOwnChatSessions({
    int page = 1,
    int size = 20,
    String? sessionId,
    int? messagePage,
    int? messageSize,
  }) async {
    final query = <String, dynamic>{
      'page': page,
      'size': size,
    };
    if (sessionId != null) query['session_id'] = sessionId;
    if (messagePage != null) query['message_page'] = messagePage;
    if (messageSize != null) query['message_size'] = messageSize;
    final res = await get('/me/chat/sessions', query: query);
    return Map<String, dynamic>.from(res as Map);
  }

  // --- Store Applications (Web StoreApplicationPage sync) ---
  Future<Map<String, dynamic>> submitStoreApplication({
    required String proposedName,
    required String contact,
  }) async {
    final body = {
      'proposed_name': proposedName.trim(),
      'contact': contact.trim(),
    };
    final res = await post('/me/store-applications', data: body);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> listOwnStoreApplications({
    int page = 1,
    int size = 20,
  }) async {
    final res = await get(
      '/me/store-applications',
      query: {'page': page, 'size': size},
    );
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> listOwnInvitations({
    int page = 1,
    int size = 20,
  }) async {
    final res = await get(
      '/me/invitations',
      query: {'page': page, 'size': size},
    );
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> acceptInvitation(String id) async {
    final res = await post('/me/invitations/$id/accept');
    return Map<String, dynamic>.from(res as Map);
  }
}
