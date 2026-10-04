import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  ApiClient({String? baseUrl, FlutterSecureStorage? storage, Dio? customDio})
      : _storage = storage ?? const FlutterSecureStorage(),
        dio = customDio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl ??
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
          return await _requestWithRetry(makeRequest, retry: false);
        } catch (_) {
          _accessToken = null;
          await _storage.delete(key: 'refresh_token');
          rethrow;
        }
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
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
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
      '/auth/forgot-password',
      data: {'email': email.trim()},
    );
    return response.data ?? {'message': 'Đã gửi liên kết đặt lại mật khẩu.'};
  }

  Future<Map<String, dynamic>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/reset-password',
      data: {
        'token': token.trim(),
        'new_password': newPassword,
      },
    );
    return response.data ?? {'message': 'Đặt lại mật khẩu thành công.'};
  }

  Future<Map<String, dynamic>> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    final res = await post(
      '/auth/change-password',
      data: {
        'old_password': oldPassword,
        'new_password': newPassword,
      },
    );
    return (res is Map<String, dynamic>) ? res : {'message': 'Đổi mật khẩu thành công.'};
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
      if (avatarUrl != null) 'avatar_url': avatarUrl.trim(),
    };
    final res = await patch('/me', data: body);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<List<Map<String, dynamic>>> getAddresses() async {
    final res = await get('/me/addresses');
    if (res is Map && res['items'] is List) {
      return (res['items'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
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

  Future<Map<String, dynamic>> updateAddress(String id, Map<String, dynamic> data) async {
    final res = await patch('/me/addresses/$id', data: data);
    return Map<String, dynamic>.from(res as Map);
  }

  Future<void> deleteAddress(String id) async {
    await delete('/me/addresses/$id');
  }

  Future<Map<String, dynamic>> setDefaultAddress(String id) async {
    final res = await patch('/me/addresses/$id/default');
    return Map<String, dynamic>.from(res as Map);
  }

  // --- Catalog & Products Endpoints (MOB-02) ---
  Future<Map<String, dynamic>> getProducts({
    String? q,
    int page = 1,
    int size = 20,
  }) async {
    final query = <String, dynamic>{
      'page': page,
      'size': size,
      if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
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
        return (res['items'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
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
        return (res['items'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
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
        return (res['items'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {
      // Fallback to empty if endpoint not yet ready
    }
    return [];
  }

  Future<Map<String, dynamic>> getRecommendations() async {
    try {
      final res = await get('/recommendations/for-you');
      if (res is Map) {
        return Map<String, dynamic>.from(res);
      }
    } catch (_) {
      // Fallback baseline recommendation response without blocking catalog
    }
    return {
      'model_version': 'baseline-mobile-v1',
      'source': 'BASELINE',
      'product_ids': <String>[],
      'recently_viewed_product_ids': <String>[],
      'mode': 'mock',
    };
  }

  Future<Map<String, dynamic>> getPersonalizationConsent() async {
    try {
      final res = await get('/me/consent');
      if (res is Map) {
        return Map<String, dynamic>.from(res);
      }
    } catch (_) {
      // Fallback consent state
    }
    return {'status': 'GRANTED', 'version': 1};
  }

  Future<Map<String, dynamic>> updatePersonalizationConsent(
    String status,
    int expectedVersion,
  ) async {
    final res = await patch('/me/consent', data: {
      'status': status,
      'expected_version': expectedVersion,
    });
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> addToCart({
    required String variantId,
    int quantity = 1,
  }) async {
    final res = await post('/cart/items', data: {
      'variant_id': variantId,
      'quantity': quantity,
    });
    return (res is Map) ? Map<String, dynamic>.from(res) : {'status': 'success'};
  }
}

