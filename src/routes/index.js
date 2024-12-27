import { Router } from "express";
import menuRoute from "./menu-route.js";

const routes = Router();
routes.use(menuRoute);

// Dummy Data
const dummyBranches = [
  {
    id: 1,
    name: "Samurai Sushi Q5",
    address: "227 Nguyễn Văn Cừ, P4, Q5, TP.HCM",
    phone: "028 1234 5678",
  },
  {
    id: 2,
    name: "Samurai Sushi Q1",
    address: "200 Lê Lai, P. Bến Thành, Q1, TP.HCM",
    phone: "028 2345 6789",
  },
];

const dummyMenuItems = [
  {
    id: 1,
    name: "Sake Nigiri",
    price: 45000,
    description: "Cá hồi tươi nhập khẩu từ Na Uy",
    category: "nigiri",
  },
  {
    id: 2,
    name: "California Roll",
    price: 85000,
    description: "Cua, bơ, dưa leo, trứng cá hồi",
    category: "roll",
  },
];

routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

// Routes
routes.get("/", (req, res) => {
  res.render("layout/main-layout", {
    title: "Samurai Sushi - Nhà hàng Nhật Bản",
    description: "Nhà hàng Nhật Bản cao cấp tại Sài Gòn",
    content: "../pages/home.ejs",
  });
});

routes.get("/dieu-khoan-su-dung", (req, res) => {
  res.render("layout/main-layout", {
    title: "Điều khoản sử dụng | Samurai Sushi",
    description: "Điều khoản sử dụng Samurai Sushi",
    content: "../pages/term-of-use.ejs",
  });
});

routes.get("/chinh-sach-bao-mat", (req, res) => {
  res.render("layout/main-layout", {
    title: "Chính sách bảo mật | Samurai Sushi",
    description: "Chính sách bảo mật Samurai Sushi",
    content: "../pages/privacy-policy.ejs",
  });
});

routes.get("/gioi-thieu", (req, res) => {
  res.render("layout/main-layout", {
    title: "Samurai Sushi - Nhà hàng Nhật Bản",
    description: "Nhà hàng Nhật Bản cao cấp tại Sài Gòn",
    content: "../pages/home.ejs",
  });
});

routes.get("/chi-nhanh", (req, res) => {
  res.render("layout/main-layout", {
    title: "Chi nhánh | Samurai Sushi",
    description: "Hệ thống chi nhánh Samurai Sushi",
    content: "../pages/branches.ejs",
    branches: dummyBranches,
  });
});

// Membership card routes
routes.get("/the-thanh-vien", (req, res) => {
  res.redirect("/the-thanh-vien/tra-cuu-diem");
});

routes.get("/the-thanh-vien/chinh-sach", (req, res) => {
  res.render("layout/main-layout", {
    title: "Chính sách thành viên | Samurai Sushi",
    description: "Chính sách thành viên Samurai Sushi",
    content: "../pages/membership-card/membership-card.ejs",
    contentPath: "../membership-card/member-policy.ejs",
  });
});

routes.get("/the-thanh-vien/tra-cuu-diem", (req, res) => {
  res.render("layout/main-layout", {
    title: "Tra cứu điểm | Samurai Sushi",
    description: "Tra cứu điểm thành viên Samurai Sushi",
    content: "../pages/membership-card/membership-card.ejs",
    contentPath: "../membership-card/point-look-up.ejs",
  });
});

routes.get("/dat-ban", (req, res) => {
  res.render("layout/main-layout", {
    title: "Đặt bàn | Samurai Sushi",
    description: "Đặt bàn tại Samurai Sushi",
    content: "../pages/reservation.ejs",
  });
});

routes.get("/khuyen-mai", (req, res) => {
  res.render("layout/main-layout", {
    title: "Khuyến mãi | Samurai Sushi",
    description: "Khuyến mãi tại Samurai Sushi",
    content: "../pages/promotions.ejs",
  });
});

// Account routes
routes.get("/tai-khoan", (req, res) => {
  res.redirect("/tai-khoan/dang-nhap");
});

routes.get("/tai-khoan/dang-ky", (req, res) => {
  res.render("layout/main-layout", {
    title: "Đăng ký | Samurai Sushi",
    description: "Đăng ký thành viên",
    content: "../pages/account/account.ejs",
    contentPath: "../account/register.ejs",
  });
});

routes.get("/tai-khoan/dang-nhap", (req, res) => {
  res.render("layout/main-layout", {
    title: "Đăng nhập | Samurai Sushi",
    description: "Đăng nhập người dùng / quản trị viên",
    content: "../pages/account/account.ejs",
    contentPath: "../account/login.ejs",
  });
});

routes.get("/dashboard/branch/:branchId", (req, res) => {
  const branchId = req.params.branchId;
  const branch = dummyBranches.find((b) => b.id === parseInt(branchId));

  if (!branch) {
    return res.status(404).render("layout/main-layout.ejs", {
      title: "404 - Không tìm thấy",
      description: "Chi nhánh không tồn tại",
      content: "../pages/404",
    });
  }

  res.render("layout/main-layout", {
    title: `Dashboard ${branch.name}`,
    description: `Quản lý chi nhánh ${branch.name}`,
    content: "../pages/dashboard-branch.ejs",
    branch,
    todayRevenue: "2.500.000đ",
    monthRevenue: "75.000.000đ",
    quarterRevenue: "220.000.000đ",
    yearRevenue: "900.000.000đ",
    branches: dummyBranches,
  });
});

routes.use((req, res) => {
  res.status(404).render("layout/main-layout.ejs", {
    title: "404 - Không tìm thấy",
    description: "Nội dung bạn đang cố truy cập không tồn tại hoặc đã bị xóa",
    content: "../pages/404",
  });
});

export default routes;
