import 'package:flutter/material.dart';

class AppColors {
  // Brand Reds from design screenshots
  static const Color primary = Color(0xFFE52E2D);
  static const Color primaryDark = Color(0xFFC61A19);
  static const Color primaryDeep = Color(0xFFBA1B1A);
  static const Color primaryLight = Color(0xFFFFECEB);
  static const Color primarySoft = Color(0xFFFFF5F5);
  static const Color accent = Color(0xFFFF3B30);
  
  // Backgrounds & Surfaces
  static const Color background = Color(0xFFF7F8FA);
  static const Color surface = Colors.white;
  static const Color surfaceSubtle = Color(0xFFFAFAFA);
  static const Color border = Color(0xFFEFEFEF);
  static const Color borderDark = Color(0xFFE5E7EB);
  static const Color divider = Color(0xFFF1F3F5);

  // Typography
  static const Color textPrimary = Color(0xFF1E232C);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textMuted = Color(0xFF9CA3AF);
  static const Color textLight = Color(0xFFD1D5DB);
  
  // Highlights & Statuses
  static const Color star = Color(0xFFFFB800);
  static const Color badge = Color(0xFFE52E2D);
  static const Color green = Color(0xFF10B981);
  static const Color greenSoft = Color(0xFFECFDF5);
  static const Color blue = Color(0xFF2563EB);
  static const Color blueSoft = Color(0xFFEFF6FF);
  static const Color orange = Color(0xFFF97316);

  // Gradients matching mobile_ui
  static const LinearGradient redGradient = LinearGradient(
    colors: [Color(0xFFE52E2D), Color(0xFFC61A19)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFFE52E2D), Color(0xFFBA1B1A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient aiBannerGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient saleBannerGradient = LinearGradient(
    colors: [Color(0xFFE52E2D), Color(0xFFB71C1C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient lightPinkGradient = LinearGradient(
    colors: [Color(0xFFFFF0F0), Color(0xFFFFE5E5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient shimmerGradient = LinearGradient(
    colors: [Color(0xFFEBEBF4), Color(0xFFF4F4F4), Color(0xFFEBEBF4)],
    stops: [0.1, 0.3, 0.4],
    begin: Alignment(-1.0, -0.3),
    end: Alignment(1.0, 0.3),
  );
}

class AppDecorations {
  /// Standard modern card decoration with subtle shadow and border
  static BoxDecoration card({
    double radius = 16,
    Color? color,
    Border? border,
    bool hasShadow = true,
  }) {
    return BoxDecoration(
      color: color ?? Colors.white,
      borderRadius: BorderRadius.circular(radius),
      border: border ?? Border.all(color: AppColors.border, width: 0.8),
      boxShadow: hasShadow
          ? [
              BoxShadow(
                color: Colors.black.withAlpha(8),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ]
          : null,
    );
  }

  /// Elevated card with prominent drop shadow
  static BoxDecoration cardElevated({
    double radius = 16,
    Color? color,
  }) {
    return BoxDecoration(
      color: color ?? Colors.white,
      borderRadius: BorderRadius.circular(radius),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withAlpha(15),
          blurRadius: 16,
          spreadRadius: 1,
          offset: const Offset(0, 6),
        ),
      ],
    );
  }

  /// Pill button with Red Gradient & shadow
  static BoxDecoration gradientButton({double radius = 24}) {
    return BoxDecoration(
      gradient: AppColors.redGradient,
      borderRadius: BorderRadius.circular(radius),
      boxShadow: [
        BoxShadow(
          color: AppColors.primary.withAlpha(90),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  /// AI glowing circular action button decoration
  static BoxDecoration aiGlow({double radius = 24}) {
    return BoxDecoration(
      gradient: AppColors.redGradient,
      shape: BoxShape.circle,
      boxShadow: [
        BoxShadow(
          color: AppColors.primary.withAlpha(110),
          blurRadius: 12,
          spreadRadius: 2,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  /// Search bar pill decoration
  static BoxDecoration searchBar = BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(24),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withAlpha(12),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ],
  );

  /// Discount tag pill decoration
  static BoxDecoration discountTag = BoxDecoration(
    color: AppColors.primary,
    borderRadius: BorderRadius.circular(6),
  );

  /// Soft circular container for list tile and feature icons
  static BoxDecoration iconCircle({Color? color}) {
    return BoxDecoration(
      color: color ?? AppColors.primaryLight,
      shape: BoxShape.circle,
    );
  }
}

class AppUtils {
  /// Mask phone number for privacy display matching mockup (e.g. 09•• ••• 678)
  static String maskPhone(String? raw) {
    if (raw == null || raw.trim().isEmpty) return 'Chưa cập nhật SĐT';
    final cleaned = raw.replaceAll(RegExp(r'\s+'), '');
    if (cleaned.length >= 9) {
      final prefix = cleaned.substring(0, 2);
      final suffix = cleaned.substring(cleaned.length - 3);
      return '$prefix•• ••• $suffix';
    }
    return raw;
  }
}


class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.primaryDark,
        surface: AppColors.surface,
        error: AppColors.primary,
      ),
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: IconThemeData(
          color: AppColors.textPrimary,
          size: 24,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary, width: 1.2),
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey.shade50,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 14,
        ),
        labelStyle: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.redAccent, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.border, width: 0.8),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
