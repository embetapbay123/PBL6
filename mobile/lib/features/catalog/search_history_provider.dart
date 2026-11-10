import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SearchHistoryNotifier extends StateNotifier<List<String>> {
  SearchHistoryNotifier([List<String>? initial]) : super(initial ?? const []) {
    _load();
  }

  static const _storageKey = 'user_search_history';
  final _storage = const FlutterSecureStorage();

  Future<void> _load() async {
    try {
      final val = await _storage.read(key: _storageKey);
      if (val != null && val.isNotEmpty) {
        final decoded = jsonDecode(val);
        if (decoded is List) {
          state = decoded.map((e) => e.toString()).toList();
        }
      }
    } catch (_) {}
  }

  Future<void> addSearch(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return;
    final list = [trimmed, ...state.where((e) => e.toLowerCase() != trimmed.toLowerCase())];
    final updated = list.take(10).toList();
    state = updated;
    try {
      await _storage.write(key: _storageKey, value: jsonEncode(updated));
    } catch (_) {}
  }

  Future<void> removeSearch(String query) async {
    final updated = state.where((e) => e != query).toList();
    state = updated;
    try {
      await _storage.write(key: _storageKey, value: jsonEncode(updated));
    } catch (_) {}
  }

  Future<void> clearHistory() async {
    state = const [];
    try {
      await _storage.delete(key: _storageKey);
    } catch (_) {}
  }
}

final searchHistoryProvider =
    StateNotifierProvider<SearchHistoryNotifier, List<String>>(
  (ref) => SearchHistoryNotifier(),
);
