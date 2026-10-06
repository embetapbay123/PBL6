import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../main.dart';

class AddressListPage extends ConsumerWidget {
  const AddressListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addressesAsync = ref.watch(addressListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sổ địa chỉ nhận hàng'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(addressListProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.pushNamed(context, '/address-form');
          if (created == true) {
            ref.invalidate(addressListProvider);
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('Thêm địa chỉ mới'),
      ),
      body: addressesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 12),
                Text(
                  errorMessage(error),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(addressListProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (addresses) {
          if (addresses.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.location_off_outlined,
                      size: 64,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Bạn chưa có địa chỉ nhận hàng nào',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Thêm địa chỉ để tiến hành đặt hàng nhanh chóng',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: () async {
                        final created = await Navigator.pushNamed(
                          context,
                          '/address-form',
                        );
                        if (created == true) {
                          ref.invalidate(addressListProvider);
                        }
                      },
                      icon: const Icon(Icons.add_location_alt_outlined),
                      label: const Text('Thêm địa chỉ ngay'),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16.0),
            itemCount: addresses.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final addr = addresses[index];
              final id = addr['id']?.toString() ?? '';
              final recipientName = addr['recipient_name']?.toString() ?? '';
              final phone = addr['phone']?.toString() ?? '';
              final street = addr['line1']?.toString() ?? '';
              final ward = addr['ward']?.toString() ?? '';
              final district = addr['district']?.toString() ?? '';
              final province = addr['city']?.toString() ?? '';
              final isDefault = addr['is_default'] == true;

              final fullAddress = [
                street,
                ward,
                district,
                province,
              ].where((part) => part.isNotEmpty).join(', ');

              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  side: BorderSide(
                    color: isDefault
                        ? const Color(0xff1648a8)
                        : Colors.grey.shade200,
                    width: isDefault ? 1.5 : 1.0,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            recipientName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '($phone)',
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              fontSize: 14,
                            ),
                          ),
                          const Spacer(),
                          if (isDefault)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xff1648a8),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'Mặc định',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        fullAddress,
                        style: TextStyle(color: Colors.grey.shade800),
                      ),
                      const Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (!isDefault)
                            TextButton(
                              onPressed: () async {
                                try {
                                  await ref
                                      .read(apiProvider)
                                      .setDefaultAddress(id);
                                  ref.invalidate(addressListProvider);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Đã thiết lập địa chỉ mặc định.',
                                        ),
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(errorMessage(e)),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                }
                              },
                              child: const Text('Đặt làm mặc định'),
                            ),
                          IconButton(
                            icon: const Icon(
                              Icons.edit_outlined,
                              color: Colors.blue,
                            ),
                            tooltip: 'Chỉnh sửa',
                            onPressed: () async {
                              final updated = await Navigator.pushNamed(
                                context,
                                '/address-form',
                                arguments: addr,
                              );
                              if (updated == true) {
                                ref.invalidate(addressListProvider);
                              }
                            },
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.delete_outline,
                              color: Colors.red,
                            ),
                            tooltip: 'Xóa địa chỉ',
                            onPressed: () async {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('Xác nhận xóa'),
                                  content: Text(
                                    'Bạn có chắc chắn muốn xóa địa chỉ của $recipientName không?',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(ctx, false),
                                      child: const Text('Hủy'),
                                    ),
                                    FilledButton(
                                      onPressed: () => Navigator.pop(ctx, true),
                                      style: FilledButton.styleFrom(
                                        backgroundColor: Colors.red,
                                      ),
                                      child: const Text('Xóa'),
                                    ),
                                  ],
                                ),
                              );

                              if (confirmed == true) {
                                try {
                                  await ref.read(apiProvider).deleteAddress(id);
                                  ref.invalidate(addressListProvider);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Đã xóa địa chỉ thành công.',
                                        ),
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(errorMessage(e)),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
