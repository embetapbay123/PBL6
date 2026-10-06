import 'dart:convert';
import 'package:flutter/services.dart';

// Explicit developer helper; never called by ApiClient on failures.
class ContractFixtures {
  static Future<Map<String, dynamic>> operation(String id) async {
    const blocked = {
      'confirmCheckout',
      'createPaymentAttempt',
      'sepayCallback',
      'sandboxCallback',
      'collectCod',
    };
    if (blocked.contains(id)) {
      throw StateError('Fixture không thực hiện checkout/thanh toán.');
    }
    const enabled = bool.fromEnvironment(
      'USE_CONTRACT_FIXTURES',
      defaultValue: false,
    );
    if (!enabled) {
      throw StateError('Bật USE_CONTRACT_FIXTURES rõ ràng để đọc fixture.');
    }
    final data =
        jsonDecode(
              await rootBundle.loadString(
                'assets/contracts/fixtures.generated.json',
              ),
            )
            as Map<String, dynamic>;
    if (!data.containsKey(id)) {
      throw ArgumentError.value(id, 'id', 'Unknown operation');
    }
    return data[id] as Map<String, dynamic>;
  }
}
