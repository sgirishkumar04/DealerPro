package com.kia.dms.config;

import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import com.kia.dms.modules.leads.entity.LeadEntity;
import com.kia.dms.modules.leads.repository.LeadRepository;
import com.kia.dms.modules.finance.entity.TransactionEntity;
import com.kia.dms.modules.finance.repository.TransactionRepository;
import com.kia.dms.modules.analytics.entity.DealerPerformanceEntity;
import com.kia.dms.modules.analytics.repository.DealerPerformanceRepository;
import com.kia.dms.modules.user.entity.*;
import com.kia.dms.modules.user.repository.*;
import com.kia.dms.modules.vehicle.entity.KiaCarEntity;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import com.kia.dms.modules.vehicle.repository.KiaCarRepository;
import com.kia.dms.modules.vehicle.repository.VehicleRepository;
import com.kia.dms.modules.leads.entity.TestDriveEntity;
import com.kia.dms.modules.leads.repository.TestDriveRepository;
import com.kia.dms.modules.service.entity.ServiceOrderEntity;
import com.kia.dms.modules.service.repository.ServiceOrderRepository;
import com.kia.dms.modules.parts.entity.PartEntity;
import com.kia.dms.modules.parts.repository.PartRepository;
import com.kia.dms.modules.parts.entity.PurchaseOrderEntity;
import com.kia.dms.modules.parts.repository.PurchaseOrderRepository;
import com.kia.dms.modules.sales.entity.OrderEntity;
import com.kia.dms.modules.sales.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import java.time.LocalDateTime;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DealerRepository dealerRepository;
    private final VehicleRepository vehicleRepository;
    private final KiaCarRepository kiaCarRepository;
    private final LeadRepository leadRepository;
    private final ServiceOrderRepository serviceOrderRepository;
    private final TestDriveRepository testDriveRepository;
    private final TransactionRepository transactionRepository;
    private final DealerPerformanceRepository dealerPerformanceRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PartRepository partRepository;
    private final ManagerRepository managerRepository;
    private final AdminRepository adminRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Checking database seeding status...");

        // ─── 0. Roles ─────────────────────────────────────────────────────────
        RoleEntity adminRole = getOrCreateRole("ROLE_ADMIN", "System administrator with full access");
        RoleEntity managerRole = getOrCreateRole("ROLE_MANAGER", "Manages dealership operations");
        RoleEntity dealerRole = getOrCreateRole("ROLE_DEALER", "Front-line dealer user");

        // ─── 1. KIA Cars (50+ real model variants) ─────────────────────────────
        if (kiaCarRepository.count() == 0) {
            List<KiaCarEntity> kiaCars = new ArrayList<>();
            // EV6 variants
            kiaCars.add(kia("EV6","Standard Range RWD","Glacier White Pearl","ELECTRIC","ELECTRIC",5,48990));
            kiaCars.add(kia("EV6","Standard Range RWD","Aurora Black Pearl","ELECTRIC","ELECTRIC",5,48990));
            kiaCars.add(kia("EV6","Long Range RWD","Steel Grey","ELECTRIC","ELECTRIC",5,54990));
            kiaCars.add(kia("EV6","Long Range RWD","Runway Red","ELECTRIC","ELECTRIC",5,54990));
            kiaCars.add(kia("EV6","Long Range AWD","Moonscape","ELECTRIC","ELECTRIC",5,58990));
            kiaCars.add(kia("EV6","GT-Line RWD","Yacht Blue","ELECTRIC","ELECTRIC",5,61990));
            kiaCars.add(kia("EV6","GT-Line AWD","Glacier White Pearl","ELECTRIC","ELECTRIC",5,64990));
            kiaCars.add(kia("EV6","GT","Jet Black","ELECTRIC","ELECTRIC",5,69990));
            // Telluride variants
            kiaCars.add(kia("Telluride","LX","Snow White Pearl","SUV","PETROL",8,38990));
            kiaCars.add(kia("Telluride","EX","Gravity Grey","SUV","PETROL",8,43990));
            kiaCars.add(kia("Telluride","EX Premium","Dark Moss","SUV","PETROL",8,47990));
            kiaCars.add(kia("Telluride","S","Wolf Grey","SUV","PETROL",8,49990));
            kiaCars.add(kia("Telluride","SX","Everlasting Silver","SUV","PETROL",8,51990));
            kiaCars.add(kia("Telluride","SX Prestige","Sangria","SUV","PETROL",8,54990));
            kiaCars.add(kia("Telluride","X-Line","Copper Sunset","SUV","PETROL",8,54990));
            kiaCars.add(kia("Telluride","X-Line SX Prestige","Ebony Black","SUV","PETROL",8,57990));
            // Seltos variants
            kiaCars.add(kia("Seltos","HTE","Clear White","SUV","PETROL",5,10900));
            kiaCars.add(kia("Seltos","HTK","Pewter Olive","SUV","PETROL",5,12500));
            kiaCars.add(kia("Seltos","HTK+","Imperial Blue","SUV","PETROL",5,14000));
            kiaCars.add(kia("Seltos","HTX","Intense Red","SUV","DIESEL",5,16500));
            kiaCars.add(kia("Seltos","HTX+","Aurora Black Pearl","SUV","DIESEL",5,18500));
            kiaCars.add(kia("Seltos","GTX+","Glacier White Pearl","SUV","PETROL",5,20000));
            kiaCars.add(kia("Seltos","X-Line","Matte Graphite","SUV","PETROL",5,21000));
            // Sonet variants
            kiaCars.add(kia("Sonet","HTE","Sparkling Silver","SUV","PETROL",5,7990));
            kiaCars.add(kia("Sonet","HTK","Imperial Blue","SUV","PETROL",5,9200));
            kiaCars.add(kia("Sonet","HTX","Intense Red","SUV","DIESEL",5,11500));
            kiaCars.add(kia("Sonet","HTX+","Aurora Black Pearl","SUV","DIESEL",5,13500));
            kiaCars.add(kia("Sonet","GTX+","Pewter Olive","SUV","PETROL",5,14800));
            // Carens variants
            kiaCars.add(kia("Carens","Premium","Imperial Blue","MPV","PETROL",7,11000));
            kiaCars.add(kia("Carens","Prestige","Glacier White Pearl","MPV","PETROL",7,13500));
            kiaCars.add(kia("Carens","Luxury","Intense Red","MPV","DIESEL",7,16500));
            kiaCars.add(kia("Carens","Luxury Plus","Aurora Black Pearl","MPV","DIESEL",7,18500));
            kiaCars.add(kia("Carens","X-Line","Matte Graphite","MPV","PETROL",7,19500));
            // Sorento variants
            kiaCars.add(kia("Sorento","LX","Snow White Pearl","SUV","PETROL",7,31990));
            kiaCars.add(kia("Sorento","EX","Midnight Black","SUV","PETROL",7,35490));
            kiaCars.add(kia("Sorento","S","Everlasting Silver","SUV","HYBRID",7,38990));
            kiaCars.add(kia("Sorento","SX","Wolf Grey","SUV","HYBRID",7,43990));
            kiaCars.add(kia("Sorento","SX Prestige","Steel Blue","SUV","HYBRID",7,48490));
            kiaCars.add(kia("Sorento","PHEV SX Prestige","Runway Red","SUV","HYBRID",7,53990));
            // Sportage variants
            kiaCars.add(kia("Sportage","LX","Clear White","SUV","PETROL",5,27990));
            kiaCars.add(kia("Sportage","EX","Wolf Grey","SUV","PETROL",5,30990));
            kiaCars.add(kia("Sportage","SX","Ice Blue","SUV","PETROL",5,34490));
            kiaCars.add(kia("Sportage","X-Line","Cyber Lime Green","SUV","HYBRID",5,37490));
            kiaCars.add(kia("Sportage","PHEV EX","Interstellar Grey","SUV","HYBRID",5,39990));
            // Carnival variants
            kiaCars.add(kia("Carnival","LX","Everlasting Silver","MPV","PETROL",8,36490));
            kiaCars.add(kia("Carnival","EX","Snow White","MPV","PETROL",8,39990));
            kiaCars.add(kia("Carnival","SX","Aurora Black","MPV","PETROL",8,44490));
            kiaCars.add(kia("Carnival","SX Prestige","Titalium Silver","MPV","PETROL",8,50990));
            kiaCarRepository.saveAll(kiaCars);
            log.info("Seeded KIA cars.");
        }

        // ─── 2. Vehicles ──────────────────────────────────────────────────────
        if (vehicleRepository.count() == 0) {
            List<KiaCarEntity> savedKiaCars = kiaCarRepository.findAll();
            List<VehicleEntity> vehicles = new ArrayList<>();
            for (KiaCarEntity kc : savedKiaCars) {
                VehicleEntity v = new VehicleEntity();
                v.setKiaCar(kc);
                v.setCategory(kc.getCategory());
                v.setPrice(kc.getPrice());
                vehicles.add(v);
            }
            vehicleRepository.saveAll(vehicles);
            log.info("Seeded vehicles.");
        }

        // ─── 3. Dealers ────────────────────────────────────────────────────────
        if (dealerRepository.count() == 0) {
            String[] dealerNames = {"KIA National HQ", "KIA Downtown Branch", "KIA Westside Motors", "KIA Northgate Auto", "KIA Eastside Gallery"};
            String[] locations = {"California", "New York", "Los Angeles", "Chicago", "Houston"};
            for (int i = 0; i < dealerNames.length; i++) {
                DealerEntity d = new DealerEntity();
                d.setName(dealerNames[i]);
                d.setLocation(locations[i]);
                d.setContactNumber("+1-555-01" + i);
                d.setEmail(dealerNames[i].toLowerCase().replace(" ", "-") + "@kia.com");
                d.setStatus("ACTIVE");
                dealerRepository.save(d);
            }
            log.info("Seeded dealers.");
        }

        // ─── 4. Managers & Admins ──────────────────────────────────────────
        if (managerRepository.count() == 0) {
            String[] managerNames = {"John Smith", "Sarah Connor", "Robert Downey", "Emma Watson", "Tony Stark"};
            for (int i = 0; i < managerNames.length; i++) {
                UserEntity mu = new UserEntity();
                mu.setName(managerNames[i]);
                String[] mNameParts = managerNames[i].split(" ", 2);
                mu.setFirstName(mNameParts[0]);
                mu.setLastName(mNameParts.length > 1 ? mNameParts[1] : "");
                mu.setEmail("manager" + (i + 1) + "@kia.com");
                mu.setPassword(passwordEncoder.encode("manager123"));
                mu.getRoles().add(managerRole);
                mu.setIsActive(true);
                userRepository.save(mu);

                ManagerEntity m = new ManagerEntity();
                m.setManagerUniqueId("MGR-100" + i);
                m.setUser(mu);
                m.setName(managerNames[i]);
                m.setEmail(mu.getEmail());
                m.setPhone("+1-555-50" + i);
                managerRepository.save(m);
            }
            log.info("Seeded 5 managers.");
        }

        if (adminRepository.count() == 0) {
            String[] adminNames = {"Admin One", "Admin Two"};
            for (int i = 0; i < adminNames.length; i++) {
                UserEntity au = new UserEntity();
                au.setName(adminNames[i]);
                String[] aNameParts = adminNames[i].split(" ", 2);
                au.setFirstName(aNameParts[0]);
                au.setLastName(aNameParts.length > 1 ? aNameParts[1] : "");
                au.setEmail("admin" + (i + 1) + "@kia.com");
                au.setPassword(passwordEncoder.encode("admin123"));
                au.getRoles().add(adminRole);
                au.setIsActive(true);
                userRepository.save(au);

                AdminEntity a = new AdminEntity();
                a.setAdminUniqueId("ADM-200" + i);
                a.setUser(au);
                a.setName(adminNames[i]);
                a.setEmail(au.getEmail());
                adminRepository.save(a);
            }
            log.info("Seeded 2 admins.");
        }

        // ─── 5. Dealers (Associate with Managers) ─────────────────────────────
        List<DealerEntity> dealers = dealerRepository.findAll();
        List<ManagerEntity> managers = managerRepository.findAll();
        if (!dealers.isEmpty() && !managers.isEmpty()) {
            for (int i = 0; i < dealers.size(); i++) {
                DealerEntity d = dealers.get(i);
                if (d.getManager() == null) {
                    d.setManager(managers.get(i % managers.size()));
                    dealerRepository.save(d);
                }
            }
        }

        if (userRepository.count() <= 10) { // Seed dealer users if not many exist
            for (int i = 0; i < dealers.size(); i++) {
                String email = "dealer" + (i + 1) + "@kia.com";
                if (!userRepository.findByEmailWithRole(email).isPresent()) {
                    UserEntity du = new UserEntity();
                    String dealerName = "Dealer User " + (i + 1);
                    du.setName(dealerName);
                    du.setFirstName("Dealer");
                    du.setLastName("User " + (i + 1));
                    du.setEmail(email);
                    du.setPassword(passwordEncoder.encode("dealer123"));
                    du.getRoles().add(dealerRole);
                    du.setDealer(dealers.get(i));
                    du.setIsActive(true);
                    userRepository.save(du);
                }
            }
            log.info("Verified dealer users.");
        }

        // ─── 6. Leads (50+ associate with Manager via Dealer) ───────────────
        if (leadRepository.count() < 50) {
            dealers = dealerRepository.findAll();
            if (dealers.isEmpty()) {
                log.warn("No dealers found, skipping lead seeding.");
                return;
            }
            String[] leadStatuses = {"NEW","CONTACTED","QUALIFIED","NEGOTIATION","CONVERTED","LOST"};
            for (int i = (int)leadRepository.count(); i < 60; i++) {
                LeadEntity lead = new LeadEntity();
                lead.setFirstName("LeadFirst" + i);
                lead.setLastName("LeadLast" + i);
                lead.setEmail("lead" + i + "@testmail.com");
                lead.setPhone("+1-555-90" + i);
                lead.setVehicleInterest("Seltos " + (i % 3));
                lead.setStatus(leadStatuses[i % leadStatuses.length]);
                DealerEntity d = dealers.get(i % dealers.size());
                lead.setDealer(d);
                // Manager is retrieved through dealer relationship
                leadRepository.save(lead);
            }
            log.info("Seeded 60 leads.");
        }

        // ─── 7. Test Drives (50+) ───────────────────────────────────────────
        if (testDriveRepository.count() < 50) {
            List<LeadEntity> leads = leadRepository.findAll();
            List<VehicleEntity> vehicles = vehicleRepository.findAll();
            for (int i = (int)testDriveRepository.count(); i < 55; i++) {
                TestDriveEntity td = new TestDriveEntity();
                LeadEntity l = leads.get(i % leads.size());
                td.setLead(l);
                td.setVehicle(vehicles.get(i % vehicles.size()));
                td.setScheduledAt(LocalDateTime.now().plusDays(i % 7).plusHours(i % 24));
                td.setStatus(i % 5 == 0 ? "COMPLETED" : "PENDING");
                // Manager is retrieved through dealer relationship
                testDriveRepository.save(td);
            }
            log.info("Seeded 55 test drives.");
        }

        // ─── 8. Service Orders (50+) ────────────────────────────────────────
        if (serviceOrderRepository.count() < 50) {
            dealers = dealerRepository.findAll();
            List<VehicleEntity> vehicles = vehicleRepository.findAll();
            for (int i = (int)serviceOrderRepository.count(); i < 52; i++) {
                ServiceOrderEntity so = new ServiceOrderEntity();
                DealerEntity d = dealers.get(i % dealers.size());
                so.setDealer(d);
                // Manager is retrieved through dealer relationship
                so.setVehicle(vehicles.get(i % vehicles.size()));
                so.setDescription("Routine Service " + i);
                so.setStatus(i % 4 == 0 ? "COMPLETED" : "IN_PROGRESS");
                serviceOrderRepository.save(so);
            }
            log.info("Seeded 52 service orders.");
        }

        // ─── 9. Transactions (50+) ──────────────────────────────────────────
        if (transactionRepository.count() < 50) {
            dealers = dealerRepository.findAll();
            for (int i = (int)transactionRepository.count(); i < 58; i++) {
                TransactionEntity tx = new TransactionEntity();
                DealerEntity d = dealers.get(i % dealers.size());
                tx.setDealer(d);
                tx.setManager(d.getManager());
                tx.setAmount(new BigDecimal(5000 + (i * 250)));
                tx.setType(i % 3 == 0 ? "DEBIT" : "CREDIT");
                tx.setDescription("Payment for order TX-" + i);
                tx.setCreatedAt(LocalDateTime.now().minusDays(i));
                transactionRepository.save(tx);
            }
            log.info("Seeded 58 transactions.");
        }

        // ─── 10. Purchase Orders (50+) ──────────────────────────────────────
        if (purchaseOrderRepository.count() < 50) {
            List<DealerEntity> poDealers = dealerRepository.findAll();
            List<PartEntity> parts = partRepository.findAll();
            if (!parts.isEmpty()) {
                for (int i = (int)purchaseOrderRepository.count(); i < 50; i++) {
                    PurchaseOrderEntity po = new PurchaseOrderEntity();
                    DealerEntity d = poDealers.get(i % poDealers.size());
                    po.setDealer(d);
                    po.setManager(d.getManager());
                    po.setPart(parts.get(i % parts.size()));
                    po.setQuantity(5 + (i % 10));
                    po.setTotalCost(new BigDecimal(15000 + (i * 1000)));
                    po.setJustification("Stock replenishment " + i);
                    purchaseOrderRepository.save(po);
                }
                log.info("Seeded 50 purchase orders.");
            }
        }

        // ─── 9. Dealer Performance ──────────────────────────────────────────
        if (dealerPerformanceRepository.count() == 0) {
            List<DealerEntity> perfDealers = dealerRepository.findAll();
            for (DealerEntity d : perfDealers) {
                DealerPerformanceEntity dp = new DealerPerformanceEntity();
                dp.setDealer(d);
                dp.setSalesCount(25);
                dp.setRevenue(new BigDecimal(750000));
                dp.setConversionRate(new BigDecimal(15.5));
                dp.setScore(85);
                dealerPerformanceRepository.save(dp);
            }
            log.info("Seeded performance data.");
        }

        log.info("Starting mass seeding (100 more entries per table)...");
        List<DealerEntity> allDealers = dealerRepository.findAll();
        List<VehicleEntity> allVehicles = vehicleRepository.findAll();
        
        if (!allDealers.isEmpty() && !allVehicles.isEmpty()) {
            // 11.1 Sales Orders
            log.info("Adding 100 more sales orders...");
            List<OrderEntity> moreOrders = new ArrayList<>();
            for (int i = 0; i < 100; i++) {
                OrderEntity order = new OrderEntity();
                DealerEntity d = allDealers.get(i % allDealers.size());
                VehicleEntity v = allVehicles.get(i % allVehicles.size());
                order.setDealer(d);
                order.setManager(d.getManager());
                order.setVehicle(v);
                order.setQuantity(1);
                BigDecimal cost = v.getPrice();
                BigDecimal margin = cost.multiply(new BigDecimal("0.20"));
                order.setTotalPrice(cost.add(margin));
                order.setStatus(i % 5 == 0 ? "DELIVERED" : "PENDING");
                moreOrders.add(order);
            }
            orderRepository.saveAll(moreOrders);

            // 11.2 Service Orders
            log.info("Adding 100 more service orders...");
            List<ServiceOrderEntity> moreServiceOrders = new ArrayList<>();
            String[] svcStatuses = {"PENDING", "IN_PROGRESS", "COMPLETED", "NEW", "WORKING"};
            for (int i = 0; i < 100; i++) {
                ServiceOrderEntity so = new ServiceOrderEntity();
                DealerEntity d = allDealers.get(i % allDealers.size());
                so.setDealer(d);
                so.setVehicle(allVehicles.get(i % allVehicles.size()));
                so.setDescription("Maintenance Batch " + i);
                so.setStatus(svcStatuses[i % svcStatuses.length]);
                moreServiceOrders.add(so);
            }
            serviceOrderRepository.saveAll(moreServiceOrders);

            // 11.3 Leads
            log.info("Adding 100 more leads...");
            List<LeadEntity> moreLeads = new ArrayList<>();
            String[] leadStatuses = {"NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"};
            for (int i = 0; i < 100; i++) {
                LeadEntity lead = new LeadEntity();
                lead.setFirstName("John" + i);
                lead.setLastName("Doe" + i);
                lead.setEmail("john.doe.v" + i + "." + (int)(Math.random()*1000) + "@example.com");
                lead.setPhone("+91-98765" + String.format("%05d", i));
                lead.setStatus(leadStatuses[i % leadStatuses.length]);
                lead.setVehicleInterest("Model " + (i % 5));
                lead.setNotes(i % 2 == 0 ? "Interested in purchase." : "Just browsing.");
                lead.setDealer(allDealers.get(i % allDealers.size()));
                moreLeads.add(lead);
            }
            leadRepository.saveAll(moreLeads);
        }

        log.info("✅ Database status checked and seeded where necessary.");
    }

    private RoleEntity getOrCreateRole(String name, String description) {
        return roleRepository.findByName(name).orElseGet(() -> {
            RoleEntity r = new RoleEntity();
            r.setName(name);
            r.setDescription(description);
            return roleRepository.save(r);
        });
    }

    private KiaCarEntity kia(String model, String variant, String color, String category, String fuel, int seats, int price) {
        KiaCarEntity k = new KiaCarEntity();
        k.setModelName(model);
        k.setVariant(variant);
        k.setColor(color);
        k.setCategory(category);
        k.setFuelType(fuel);
        k.setSeatingCapacity(seats);
        k.setPrice(new BigDecimal(price));
        return k;
    }
}
