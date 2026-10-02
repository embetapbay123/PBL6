import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  ApiClient({String? baseUrl, FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage(),
        dio = Dio(BaseOptions(
          baseUrl: baseUrl ?? const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:8080/api/v1'),
          connectTimeout: const Duration(seconds: 3), receiveTimeout: const Duration(seconds: 7),
        ));
  final Dio dio;
  final FlutterSecureStorage _storage;
  String? _accessToken;
  Future<void>? _refreshing;
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await dio.post<Map<String, dynamic>>('/auth/login', data: {'email': email, 'password': password, 'client_type': 'MOBILE'});
    await _saveTokens(response.data!); return response.data!;
  }
  Future<void> _saveTokens(Map<String, dynamic> tokens) async {
    _accessToken = tokens['access_token'] as String;
    await _storage.write(key: 'refresh_token', value: tokens['refresh_token'] as String);
  }
  Future<void> _refresh() async {
    final token = await _storage.read(key: 'refresh_token');
    if (token == null) throw StateError('Vui lòng đăng nhập.');
    final response = await dio.post<Map<String, dynamic>>('/auth/refresh', data: {'refresh_token': token});
    await _saveTokens(response.data!);
  }
  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool retry = true}) async {
    try {
      return (await dio.get<dynamic>(path, queryParameters: query, options: Options(headers: {if (_accessToken != null) 'Authorization': 'Bearer $_accessToken'}))).data;
    } on DioException catch (error) {
      if (error.response?.statusCode == 401 && retry) {
        _refreshing ??= _refresh().whenComplete(() => _refreshing = null);
        await _refreshing; return get(path, query: query, retry: false);
      }
      rethrow;
    }
  }
  Future<void> logout() async {
    final token = await _storage.read(key: 'refresh_token');
    try {if (token != null) await dio.post('/auth/logout', data: {'refresh_token': token});}
    finally {_accessToken = null; await _storage.delete(key: 'refresh_token');}
  }
}
