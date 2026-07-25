# Trả lời cho Emergent

Chọn **mục 1: Xây dựng toàn bộ ứng dụng từ đầu**, với đặc tả đầy đủ như sau:

## 1. Family Member Features (tất cả 6 mục)
- **Resident profile**: ảnh đại diện, thông tin cơ bản (giới tính, tuổi, nhóm máu, phòng), tình trạng bệnh lý (bệnh mãn tính, dị ứng, dị ứng thuốc, tiền sử bệnh)
- **Daily activity logs**: ăn uống, hoạt động, tâm trạng
- **Health updates**: sinh hiệu, thuốc/đơn thuốc, lịch khám bác sĩ
- **Photo gallery**: người chăm sóc tải ảnh lên, gia đình xem theo từng cư dân, có chú thích
- **Visit scheduling**: gia đình gửi yêu cầu thăm (ngày giờ, số người đi cùng), quản lý duyệt/từ chối (có lý do)
- **Messaging**: chat 2 chiều thời gian thực (hoặc gần thời gian thực) giữa gia đình và nhân viên/quản lý

## 2. Caregiver Duties (tất cả 6 mục)
- **Check-in/check-out**: chấm công vào/ra cho ca trực đã được xác nhận
- **Log daily activities**: ghi nhận cho ăn, tắm rửa, vệ sinh
- **Record vital signs**: huyết áp, nhiệt độ, nhịp tim, SpO2, đường huyết — **chỉ ghi được cho cư dân được phân công phụ trách** (không phải toàn bộ cư dân)
- **Submit incident/observation reports**: loại sự cố, mức độ nghiêm trọng (thấp/trung bình/cao/khẩn cấp), vị trí, mô tả, trạng thái xử lý
- **Update family with photos/notes**: tải ảnh + chú thích cho cư dân được phân công
- **View resident care plans**: xem (không sửa) thực đơn, chế độ ăn đặc biệt, báo cáo dinh dưỡng do y tá lập

## 3. Authentication
JWT-based email/password. Không dùng Google/social login. Không phải open access — mọi API đều yêu cầu đăng nhập và phân quyền theo role.

## 4. App Structure
Một app duy nhất, phân quyền theo role (không phải 2 app tách biệt Family/Caregiver). Vai trò gồm: gia đình (family), y tá (nurse/doctor), hộ lý/người chăm sóc (caregiver), quản lý (manager/admin). Sau khi đăng nhập, hệ thống tự điều hướng vào giao diện phù hợp với role.

## 5. Ưu tiên triển khai
Thứ tự đề xuất theo độ phức tạp tăng dần:
1. Auth + phân quyền theo role (nền tảng)
2. Ghi sinh hiệu + báo cáo sự cố (caregiver)
3. Nhật ký hoạt động hàng ngày + xem sức khỏe (family)
4. Xem kế hoạch chăm sóc (caregiver, read-only)
5. Thư viện ảnh (upload + xem)
6. Đặt lịch thăm (có duyệt)
7. Nhắn tin 2 chiều (phức tạp nhất, làm sau cùng)

## Lưu ý quan trọng
Đây là một bản build **mới, độc lập** — không phải tiếp nối code hiện có (vì nền tảng của bạn không truy cập được vào codebase cục bộ tôi đang dùng). Nếu sau này cần đồng bộ 2 bản với nhau, sẽ cần thảo luận riêng về cách kết nối (ví dụ qua GitHub) — chưa cần xử lý ở bước này.
