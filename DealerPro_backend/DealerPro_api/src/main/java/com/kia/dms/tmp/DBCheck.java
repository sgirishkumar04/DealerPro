package com.kia.dms.tmp;

import java.sql.*;

public class DBCheck {
    public static void main(String[] args) {
        String url = "jdbc:sqlite:D:/My Projects/dms/db/DealerPro.db";
        String[] tables = {"users", "leads", "test_drives", "service_orders", "transactions", "orders", "inventory"};
        try (Connection conn = DriverManager.getConnection(url)) {
            for (String table : tables) {
                try (Statement stmt = conn.createStatement();
                     ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM " + table)) {
                    if (rs.next()) {
                        System.out.println("Table " + table + ": " + rs.getInt(1) + " rows");
                    }
                } catch (SQLException e) {
                    System.out.println("Table " + table + " does not exist or error: " + e.getMessage());
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
