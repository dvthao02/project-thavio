'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronDown, ChevronRight, Crown, Edit2, KeyRound,
  Layers3, Loader2, Save, Search, ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  moduleKey: string;
  description: string | null;
}

interface AccountRow {
  id: string;
  fullName: string;
  email: string | null;
  scopeType: string;
}

interface RoleDetail {
  id: string;
  roleKey: string;
  roleName: string;
  description: string | null;
  roleScope: string;
  isSystem: boolean;
  createdAt: string;
  permissions: Permission[];
  accounts: AccountRow[];
}

interface AllPermsModule {
  moduleKey: string;
  count: number;
  permissions: Permission[];
}

// ── Config ──────────────────────────────────────────────────────────────────────

const SCOPE_META: Record<string, { label: string; cls: string }> = {
  platform: { label: 'Platform', cls: 'bg-violet-500/10 text-violet-700' },
  business: { label: 'Business', cls: 'bg-sky-500/10 text-sky-700' },
};

const SCOPE_TYPE_LABEL: Record<string, string> = {
  platform: 'Platform',
  business: 'Business',
  store: 'Store',
};

const MODULE_LABEL: Record<string, string> = {
  ORDER: 'Đơn hàng',
  PRODUCT: 'Sản phẩm',
  INVENTORY: 'Kho hàng',
  CUSTOMER: 'Khách hàng',
  PAYMENT: 'Thanh toán',
  REPORT: 'Báo cáo',
  STAFF: 'Nhân viên',
  STORE: 'Cửa hàng',
  SETTING: 'Cài đặt',
  CASH: 'Két tiền',
  AUDIT: 'Nhật ký',
  APPROVAL: 'Phê duyệt',
  PROMOTION: 'Khuyến mãi',
  KITCHEN: 'Bếp',
  DELIVERY: 'Giao hàng',
  TABLE: 'Bàn ăn',
  SUBSCRIPTION: 'Gói dịch vụ',
  BUSINESS: 'Doanh nghiệp',
  ROLE: 'Vai trò',
  ACCOUNT: 'Tài khoản',
};

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

// ── Helpers ────────────────────────────────────────────────────────────────────

function useEscapeKey(active: boolean, handler: () => void) {
  useEffect(() => {
    if (!active) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [active, handler]);
}

function CompactStat({
  label, value, sub, icon: Icon, tone,
}: {
  label: string; value: number | string; sub: string; icon: React.ElementType; tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-bold leading-none text-foreground">{value}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

// ── Permission descriptions ────────────────────────────────────────────────────

const PERM_DESC: Record<string, string> = {
  // APPROVAL
  'approval.approve': 'Duyệt các yêu cầu chờ xử lý như giảm giá đặc biệt, hoàn trả, điều chỉnh tồn kho do cấp dưới gửi lên.',
  'approval.reject': 'Từ chối yêu cầu không hợp lệ và gửi lý do từ chối về cho người yêu cầu.',
  'approval.view': 'Xem toàn bộ danh sách và lịch sử các yêu cầu phê duyệt trong cửa hàng.',
  // AUDIT
  'activity_log.view': 'Xem nhật ký hoạt động chi tiết của tất cả nhân viên: ai đã làm gì, lúc mấy giờ.',
  // CASH
  'cash.bank_deposit': 'Thực hiện lệnh nộp tiền mặt từ két vào tài khoản ngân hàng của cửa hàng.',
  'cash.drawer.count': 'Đếm và kiểm tra số tiền thực tế trong ngăn kéo, so sánh với hệ thống.',
  'cash.drawer.reconcile': 'Đối soát ngăn kéo tiền cuối ca, xác nhận hoặc ghi nhận chênh lệch.',
  'cash.movement.create': 'Ghi thu/chi ngoài giao dịch bán hàng như tiền điện, thuê mặt bằng, chi lặt vặt.',
  'cash.view': 'Xem báo cáo két tiền, số dư hiện tại và toàn bộ lịch sử giao dịch quỹ.',
  // CHANNEL
  'channel.manage': 'Cấu hình và quản lý các kênh bán hàng như website, sàn TMĐT, đại lý.',
  'channel.sync': 'Đồng bộ sản phẩm, giá bán và tồn kho lên các kênh bán ngoài hệ thống.',
  'channel.view': 'Xem danh sách kênh bán, trạng thái kết nối và số đơn từng kênh.',
  // CUSTOMER
  'customer.campaign.manage': 'Tạo và quản lý chiến dịch marketing, chương trình khuyến mãi dành cho từng nhóm khách.',
  'customer.consent.update': 'Cập nhật trạng thái đồng ý nhận email/SMS marketing và chính sách bảo mật của khách.',
  'customer.create': 'Tạo hồ sơ khách hàng mới: tên, số điện thoại, ngày sinh, địa chỉ.',
  'customer.disable': 'Khóa tài khoản khách hàng, ngừng tích lũy điểm và các ưu đãi thành viên.',
  'customer.export': 'Xuất toàn bộ danh sách khách hàng ra file Excel/CSV để phân tích hoặc gửi email.',
  'customer.merge': 'Gộp 2 hồ sơ khách hàng bị trùng lặp thành một, giữ nguyên lịch sử mua hàng.',
  'customer.point.adjust': 'Điều chỉnh thủ công số điểm tích lũy của khách (cộng hoặc trừ có lý do).',
  'customer.update': 'Sửa thông tin khách hàng: tên, số điện thoại, địa chỉ, ghi chú nội bộ.',
  'customer.view': 'Xem danh sách khách hàng và chi tiết hồ sơ từng người: lịch sử mua, điểm, công nợ.',
  // FINANCE
  'finance.journal.post': 'Hạch toán bút toán kế toán thủ công vào sổ cái của kỳ hiện tại.',
  'finance.period.lock': 'Khóa kỳ kế toán đã quyết toán, ngăn mọi chỉnh sửa số liệu.',
  'finance.period.reopen': 'Mở lại kỳ kế toán đã khóa để điều chỉnh sai sót (cần phê duyệt).',
  'finance.view': 'Xem báo cáo tài chính tổng hợp, sổ cái và chi tiết bút toán.',
  // INVENTORY
  'inventory.adjust': 'Điều chỉnh số lượng tồn kho thủ công sau kiểm kê hoặc phát hiện chênh lệch.',
  'inventory.costing.adjust': 'Điều chỉnh giá vốn bình quân của hàng trong kho.',
  'inventory.costing.view': 'Xem giá vốn và tổng giá trị hàng tồn kho theo từng sản phẩm.',
  'inventory.deduct': 'Xuất kho thủ công ngoài quy trình bán hàng như hàng mẫu, quà tặng nội bộ.',
  'inventory.reserve': 'Đặt giữ số lượng tồn kho cho đơn hàng đang xử lý, tránh bán trùng.',
  'inventory.stocktake': 'Tạo và thực hiện phiếu kiểm kê hàng tồn kho định kỳ hoặc đột xuất.',
  'inventory.stocktake.approve': 'Duyệt kết quả kiểm kê và áp dụng chênh lệch vào hệ thống chính thức.',
  'inventory.transaction.view': 'Xem toàn bộ lịch sử nhập/xuất kho kèm lý do và người thực hiện.',
  'inventory.transfer': 'Tạo phiếu chuyển hàng giữa các kho hoặc chi nhánh khác nhau.',
  'inventory.transfer.approve': 'Xác nhận phiếu chuyển kho tại kho nhận, hoàn tất giao dịch.',
  'inventory.view': 'Xem số lượng tồn kho hiện tại theo từng sản phẩm và từng kho.',
  'inventory.view_cost': 'Xem giá vốn của sản phẩm — thường chỉ dành cho quản lý và kế toán.',
  // INVOICE
  'invoice.cancel': 'Hủy hóa đơn đã phát hành (cần lý do hủy, lưu lịch sử).',
  'invoice.create': 'Tạo và phát hành hóa đơn bán hàng điện tử hoặc giấy cho khách.',
  'invoice.credit_note.create': 'Phát hành hóa đơn điều chỉnh/ghi có khi hoàn trả hàng hoặc sửa sai.',
  'invoice.view': 'Xem danh sách và chi tiết hóa đơn đã phát hành.',
  // KITCHEN
  'kitchen.update': 'Cập nhật trạng thái món ăn trên màn hình bếp: đang nấu → sẵn sàng → đã phục vụ.',
  'kitchen.view': 'Xem màn hình bếp (KDS) với toàn bộ ticket cần xử lý theo thứ tự thời gian.',
  // LOYALTY
  'loyalty.manage': 'Cấu hình chương trình tích điểm: tỷ lệ tích, điều kiện đổi thưởng, cấp bậc.',
  'loyalty.view': 'Xem báo cáo và lịch sử chương trình khách hàng thân thiết.',
  // NOTIFICATION
  'notification.send': 'Gửi thông báo push, SMS hoặc email hàng loạt tới nhóm khách hàng.',
  'notification.view': 'Xem danh sách thông báo đã gửi, tỉ lệ mở và phản hồi.',
  // ORDER
  'order.cancel': 'Hủy đơn hàng đang xử lý. Đơn đã hoàn thành không thể hủy theo luồng này.',
  'order.complete': 'Đánh dấu hoàn thành đơn hàng thủ công khi hệ thống không tự động chuyển.',
  'order.create': 'Tạo đơn hàng mới cho khách — bước đầu tiên trong quy trình bán hàng.',
  'order.credit_override': 'Cho phép bán chịu vượt hạn mức tín dụng đã cấp cho khách hàng.',
  'order.discount.apply': 'Áp dụng giảm giá trực tiếp theo phần trăm hoặc số tiền cố định lên đơn.',
  'order.exchange': 'Tạo đơn đổi hàng, nhập hàng cũ và xuất hàng mới trong cùng một giao dịch.',
  'order.merge_table': 'Gộp hai bàn ăn đang phục vụ thành một đơn hàng duy nhất.',
  'order.move_table': 'Chuyển toàn bộ đơn hàng của một bàn sang bàn khác đang trống.',
  'order.price.override': 'Ghi đè giá bán tùy ý, khác với giá niêm yết trong danh mục sản phẩm.',
  'order.return': 'Tạo đơn trả hàng và hoàn tiền hoặc ghi có cho khách.',
  'order.sell_on_credit': 'Bán chịu theo hạn mức: ghi nợ, khách sẽ thanh toán vào kỳ sau.',
  'order.split_bill': 'Tách hóa đơn thành nhiều phần để khách thanh toán riêng (chia bill).',
  'order.update_draft': 'Sửa đơn hàng đang ở trạng thái nháp hoặc chờ xác nhận.',
  'order.view': 'Xem danh sách và chi tiết đơn hàng — của mình hoặc toàn cửa hàng tùy cấu hình.',
  'order.void': 'Hủy trắng đơn mà không tạo bút toán hoàn tiền, dùng cho đơn nhập sai.',
  // PAYMENT
  'payment.bank_transfer': 'Nhận thanh toán qua chuyển khoản ngân hàng, tự động đối soát số tài khoản.',
  'payment.card': 'Nhận thanh toán bằng thẻ ATM, Visa, Mastercard qua máy POS.',
  'payment.cash': 'Nhận thanh toán bằng tiền mặt và tính tiền thừa trả lại khách.',
  'payment.e_wallet': 'Nhận thanh toán qua ví điện tử: MoMo, ZaloPay, VNPay QR.',
  'payment.partial': 'Nhận thanh toán một phần, phần còn lại ghi nợ khách hàng.',
  'payment.point': 'Nhận thanh toán bằng điểm tích lũy — trừ điểm và ghi nhận vào đơn.',
  'payment.process': 'Xử lý và xác nhận giao dịch thanh toán qua bất kỳ phương thức nào.',
  'payment.reconcile': 'Đối soát doanh thu thanh toán theo từng phương thức với sao kê ngân hàng.',
  'payment.refund': 'Hoàn tiền cho khách khi hủy đơn hoặc trả hàng theo phương thức gốc.',
  'payment.refund_override': 'Hoàn tiền vượt giá trị giao dịch gốc trong trường hợp đặc biệt được duyệt.',
  'payment.view': 'Xem lịch sử giao dịch thanh toán theo từng đơn hoặc tổng hợp theo ngày.',
  'payment.voucher': 'Nhận thanh toán bằng voucher giảm giá hoặc phiếu quà tặng.',
  // POS
  'pos.enter': 'Truy cập vào màn hình bán hàng POS — bắt buộc với mọi nhân viên bán hàng.',
  'pos.open_register': 'Mở ca bán hàng, nhập số tiền đầu ca và khởi động ngăn kéo tiền.',
  'receipt.print': 'In biên lai giấy hoặc gửi biên lai điện tử qua email/SMS cho khách.',
  // PRODUCT
  'product.barcode.manage': 'Tạo, in và gán mã vạch/QR code cho sản phẩm và biến thể.',
  'product.cost.update': 'Cập nhật giá vốn nhập hàng của sản phẩm — ảnh hưởng trực tiếp đến lợi nhuận.',
  'product.create': 'Thêm sản phẩm/dịch vụ mới vào danh mục với đầy đủ thông tin.',
  'product.delete': 'Xóa sản phẩm khỏi hệ thống. Sản phẩm đã bán sẽ bị ẩn, không xóa thật.',
  'product.export': 'Xuất toàn bộ danh mục sản phẩm ra file Excel để chỉnh sửa hàng loạt.',
  'product.import': 'Nhập danh mục sản phẩm mới hoặc cập nhật hàng loạt từ file Excel.',
  'product.lot.manage': 'Quản lý lô hàng, ngày sản xuất và hạn sử dụng của từng lô.',
  'product.media.manage': 'Upload, sắp xếp và quản lý hình ảnh, video của sản phẩm.',
  'product.price.update': 'Cập nhật giá bán lẻ — có thể áp dụng ngay hoặc lên lịch thay đổi.',
  'product.recipe.manage': 'Quản lý định mức nguyên liệu (BOM) cho sản phẩm chế biến/F&B.',
  'product.serial.manage': 'Quản lý số serial, IMEI của sản phẩm điện tử, thiết bị có định danh.',
  'product.update': 'Sửa thông tin sản phẩm: tên, mô tả, danh mục, thuộc tính, đơn vị tính.',
  'product.view': 'Xem danh mục sản phẩm, giá, tồn kho và các thông tin cơ bản.',
  // PRODUCTION
  'production.manage': 'Tạo và quản lý lệnh sản xuất/chế biến, theo dõi tiến độ hoàn thành.',
  'production.view': 'Xem lịch sử và trạng thái các lệnh sản xuất.',
  'waste.create': 'Ghi nhận hàng hỏng, nguyên liệu hao hụt trong quá trình chế biến.',
  // PROMOTION
  'promotion.create': 'Tạo chương trình khuyến mãi mới: flash sale, mua X tặng Y, giảm theo nhóm.',
  'promotion.delete': 'Xóa chương trình khuyến mãi đã kết thúc hoặc tạo sai.',
  'promotion.update': 'Sửa điều kiện, thời gian và giá trị của chương trình khuyến mãi.',
  'promotion.view': 'Xem danh sách khuyến mãi đang chạy và báo cáo hiệu quả.',
  // PURCHASE
  'purchase.cancel': 'Hủy đơn đặt hàng nhà cung cấp chưa được xử lý.',
  'purchase.create': 'Tạo đơn đặt hàng mới gửi cho nhà cung cấp.',
  'purchase.payable.view': 'Xem công nợ phải trả nhà cung cấp theo từng đơn và tổng hợp.',
  'purchase.payment.process': 'Thanh toán công nợ cho nhà cung cấp và ghi nhận vào sổ.',
  'purchase.receive': 'Xác nhận nhập kho hàng hóa đã nhận từ nhà cung cấp theo đơn đặt.',
  'purchase.return': 'Tạo phiếu trả lại hàng không đạt chất lượng cho nhà cung cấp.',
  'purchase.view': 'Xem danh sách đơn đặt hàng, trạng thái giao hàng và lịch sử mua.',
  // RBAC
  'role.assign_permission': 'Gán hoặc thu hồi quyền hạn cụ thể cho từng vai trò.',
  'role.create': 'Tạo vai trò mới với tên và quyền hạn tùy chỉnh.',
  'role.update': 'Sửa tên và mô tả của vai trò hiện có.',
  'role.view': 'Xem danh sách tất cả vai trò và quyền hạn đang được gán.',
  // RECEIVABLE
  'receivable.adjust': 'Điều chỉnh số dư công nợ phải thu do sai sót hoặc thỏa thuận đặc biệt.',
  'receivable.collect': 'Ghi nhận thu tiền từ khách hàng đang nợ và cập nhật số dư.',
  'receivable.create': 'Tạo phiếu công nợ mới khi khách mua chịu hoặc thanh toán thiếu.',
  'receivable.export': 'Xuất báo cáo công nợ phải thu ra file để gửi khách hoặc đối soát.',
  'receivable.view': 'Xem danh sách khách đang nợ, số tiền và lịch sử thanh toán từng người.',
  'receivable.write_off': 'Xóa khoản nợ khó đòi sau khi đã tất toán mọi biện pháp thu hồi.',
  // REPORT
  'report.cost_profit.view': 'Xem báo cáo giá vốn hàng bán và lợi nhuận gộp theo sản phẩm/kỳ.',
  'report.export': 'Xuất bất kỳ báo cáo nào ra file Excel hoặc PDF.',
  'report.inventory.view': 'Xem báo cáo tình hình nhập/xuất/tồn kho theo từng kỳ.',
  'report.profit.view': 'Xem báo cáo lợi nhuận ròng sau khi trừ toàn bộ chi phí vận hành.',
  'report.sales.view': 'Xem báo cáo doanh thu bán hàng theo ngày, tuần, tháng và nhân viên.',
  'report.staff.view': 'Xem báo cáo hiệu suất từng nhân viên: số đơn, doanh thu, giờ làm.',
  // SERVICE
  'service.manage': 'Tạo và quản lý gói dịch vụ, bảo trì, bảo hành của sản phẩm.',
  'service.view': 'Xem danh sách phiếu dịch vụ và trạng thái xử lý.',
  'warranty.claim.process': 'Tiếp nhận và xử lý yêu cầu bảo hành, đổi trả trong thời hạn bảo hành.',
  // SETTING
  'setting.update': 'Cập nhật cấu hình hoạt động cửa hàng: thuế, in hóa đơn, tích hợp thanh toán.',
  'setting.view': 'Xem toàn bộ cài đặt hiện tại của cửa hàng mà không chỉnh sửa được.',
  // SHIFT
  'shift.close': 'Đóng ca, chốt doanh thu, in báo cáo ca và chuyển tiền về két.',
  'shift.open': 'Mở ca làm việc mới, nhập số tiền đầu ca từ ngăn kéo.',
  'shift.view': 'Xem lịch sử ca làm việc, doanh thu từng ca và người phụ trách.',
  // SHIPPING
  'shipping.cod_reconcile': 'Đối soát tiền COD nhận từ đơn vị vận chuyển với đơn hàng thực tế.',
  'shipping.create': 'Tạo yêu cầu giao hàng tận nơi, in phiếu giao và bàn giao cho shipper.',
  'shipping.update': 'Cập nhật trạng thái đơn giao hàng: đang giao, giao thành công, hoàn về.',
  'shipping.view': 'Xem danh sách và trạng thái toàn bộ đơn giao hàng.',
  // STAFF
  'staff.assign_role': 'Gán vai trò và phân quyền cho nhân viên theo vị trí công việc.',
  'staff.assign_store': 'Phân công nhân viên vào cửa hàng hoặc chi nhánh phụ trách.',
  'staff.create': 'Tạo tài khoản nhân viên mới với thông tin cá nhân và đăng nhập.',
  'staff.disable': 'Khóa tài khoản nhân viên nghỉ việc, thu hồi quyền truy cập ngay lập tức.',
  'staff.reset_pin': 'Reset mã PIN đăng nhập POS khi nhân viên quên hoặc bị lộ.',
  'staff.salary.update': 'Cập nhật mức lương cố định, hoa hồng và chính sách thưởng.',
  'staff.salary.view': 'Xem thông tin lương và hoa hồng của nhân viên — chỉ người có quyền.',
  'staff.update': 'Sửa thông tin cá nhân nhân viên: tên, liên hệ, ca làm, vị trí.',
  'staff.view': 'Xem danh sách nhân viên và hồ sơ từng người.',
  // STORE
  'store.config.update': 'Cập nhật cấu hình vận hành: giờ mở cửa, chính sách bán, kết nối thiết bị.',
  'store.create': 'Tạo chi nhánh hoặc cửa hàng mới trong hệ thống.',
  'store.device.bind': 'Kết nối và cấu hình thiết bị POS, máy in nhiệt, máy quét mã vạch.',
  'store.disable': 'Đóng cửa hàng/chi nhánh, ngừng hoạt động và ẩn khỏi hệ thống.',
  'store.update': 'Cập nhật thông tin cửa hàng: tên, địa chỉ, số điện thoại, logo.',
  'store.view': 'Xem thông tin và trạng thái hoạt động của các cửa hàng.',
  // SUPPLIER
  'supplier.create': 'Thêm nhà cung cấp mới: tên, liên hệ, điều khoản thanh toán.',
  'supplier.disable': 'Ngừng hợp tác với nhà cung cấp, ẩn khỏi danh sách đặt hàng.',
  'supplier.update': 'Cập nhật thông tin liên hệ, địa chỉ và điều khoản của nhà cung cấp.',
  'supplier.view': 'Xem danh sách nhà cung cấp và lịch sử giao dịch.',
  // TABLE
  'table.manage': 'Tạo, sửa, xóa bàn ăn và khu vực phục vụ trong sơ đồ nhà hàng.',
  'table.view': 'Xem sơ đồ bàn thời gian thực: bàn trống, đang phục vụ, đã đặt trước.',
  // WALLET
  'wallet.adjust': 'Điều chỉnh số dư ví điện tử của khách hàng (nạp, trừ có lý do).',
  'wallet.view': 'Xem số dư ví và toàn bộ lịch sử giao dịch nạp/rút của khách.',
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const qc = useQueryClient();

  const isPlatformAdmin = useAuthStore((s) => s.user?.isPlatformAdmin ?? false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ roleName: '', description: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  // Local permission state for batch editing
  const [localChecked, setLocalChecked] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [hoveredPerm, setHoveredPerm] = useState<{ perm: Permission; rect: DOMRect } | null>(null);

  useEscapeKey(editOpen, () => setEditOpen(false));
  useEscapeKey(deleteConfirm, () => setDeleteConfirm(false));

  const { data: role, isLoading, isError } = useQuery<RoleDetail>({
    queryKey: ['rbac-role', id],
    queryFn: () => api.get(`/platform/rbac/roles/${id}`).then((r) => r.data),
  });

  const { data: allPermsData, isLoading: permsLoading } = useQuery<{ total: number; modules: AllPermsModule[] }>({
    queryKey: ['rbac-permissions', role?.roleScope ?? 'platform'],
    queryFn: () =>
      api.get('/platform/rbac/permissions', { params: { scope: role?.roleScope ?? 'platform' } }).then((r) => r.data),
    enabled: !!role,
  });

  // Sync localChecked from server when role loads (or after save)
  useEffect(() => {
    if (role) {
      setLocalChecked(new Set(role.permissions.map((p) => p.id)));
    }
  }, [role]);

  const assignedIds = useMemo(() => new Set(role?.permissions.map((p) => p.id) ?? []), [role]);

  // Dirty check
  const dirty = useMemo(() => {
    if (!localChecked || !role) return false;
    if (localChecked.size !== assignedIds.size) return true;
    for (const id of localChecked) { if (!assignedIds.has(id)) return true; }
    return false;
  }, [localChecked, assignedIds, role]);

  const toAdd = useMemo(() => {
    if (!localChecked) return [];
    return Array.from(localChecked).filter((id) => !assignedIds.has(id));
  }, [localChecked, assignedIds]);

  const toRemove = useMemo(() => {
    if (!localChecked) return [];
    return Array.from(assignedIds).filter((id) => !localChecked.has(id));
  }, [localChecked, assignedIds]);

  // Filtered + grouped permissions
  const filteredModules = useMemo(() => {
    if (!allPermsData) return [];
    const q = permSearch.toLowerCase();
    return allPermsData.modules
      .map((m) => ({
        ...m,
        permissions: q
          ? m.permissions.filter(
              (p) =>
                p.permissionName.toLowerCase().includes(q) ||
                p.permissionKey.toLowerCase().includes(q),
            )
          : m.permissions,
      }))
      .filter((m) => m.permissions.length > 0);
  }, [allPermsData, permSearch]);

  const updateMut = useMutation({
    mutationFn: (body: { roleName?: string; description?: string }) =>
      api.patch(`/platform/rbac/roles/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-role', id] });
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      setEditOpen(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/platform/rbac/roles/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      router.push(`/admin/rbac/roles?scope=${role?.roleScope ?? 'platform'}`);
    },
  });

  const handleSave = async () => {
    if (!dirty || !localChecked) return;
    setSaving(true);
    setSaveError('');
    try {
      await Promise.all([
        ...toAdd.map((permId) =>
          api.post(`/platform/rbac/roles/${id}/permissions`, { permissionId: permId }),
        ),
        ...toRemove.map((permId) =>
          api.delete(`/platform/rbac/roles/${id}/permissions/${permId}`),
        ),
      ]);
      await qc.invalidateQueries({ queryKey: ['rbac-role', id] });
      await qc.invalidateQueries({ queryKey: ['rbac-roles'] });
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Không thể lưu thay đổi quyền.'));
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (permId: string) => {
    setLocalChecked((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };
  
  const toggleModule = (moduleKey: string, perms: Permission[]) => {
    const allChecked = perms.every((p) => localChecked?.has(p.id));
    setLocalChecked((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (allChecked) {
        perms.forEach((p) => next.delete(p.id));
      } else {
        perms.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleCollapse = (moduleKey: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  const openEdit = () => {
    setEditForm({ roleName: role?.roleName ?? '', description: role?.description ?? '' });
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <ShieldCheck size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Không tìm thấy vai trò.</p>
        <Link href={`/admin/rbac/roles?scope=${role?.roleScope ?? 'platform'}`} className="text-sm text-primary hover:underline">
          Quay lại
        </Link>
      </div>
    );
  }

  const scopeMeta = SCOPE_META[role.roleScope] ?? SCOPE_META.platform;
  const checkedCount = localChecked?.size ?? role.permissions.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href={`/admin/rbac/roles?scope=${role.roleScope}`}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{role.roleName}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scopeMeta.cls}`}>
              {scopeMeta.label}
            </span>
            {role.isSystem && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hệ thống</span>
            )}
          </div>
          <code className="mt-1 block text-xs text-muted-foreground">{role.roleKey}</code>
          {role.description && (
            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={openEdit}
            disabled={role.isSystem && !isPlatformAdmin}
            title={role.isSystem && !isPlatformAdmin ? 'Không thể sửa vai trò hệ thống' : 'Sửa vai trò'}
            className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Edit2 size={13} /> Sửa
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            disabled={role.isSystem && !isPlatformAdmin}
            title={role.isSystem && !isPlatformAdmin ? 'Không thể xóa vai trò hệ thống' : 'Xóa vai trò'}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CompactStat
          label="Quyền"
          value={checkedCount}
          sub={dirty ? `${toAdd.length} thêm · ${toRemove.length} bỏ` : 'Quyền được gán'}
          icon={KeyRound}
          tone="bg-primary/10 text-primary"
        />
        <CompactStat
          label="Module"
          value={allPermsData?.modules.length ?? 0}
          sub="Nhóm nghiệp vụ"
          icon={Layers3}
          tone="bg-sky-500/10 text-sky-700"
        />
        <CompactStat
          label="Tài khoản"
          value={role.accounts.length}
          sub="Đang dùng vai trò"
          icon={Users}
          tone="bg-emerald-500/10 text-emerald-700"
        />
        <CompactStat
          label="Loại"
          value={role.isSystem ? 'Hệ thống' : 'Tùy chỉnh'}
          sub={scopeMeta.label}
          icon={role.isSystem ? Crown : ShieldCheck}
          tone={role.isSystem ? 'bg-amber-500/10 text-amber-700' : 'bg-violet-500/10 text-violet-700'}
        />
      </div>

      {/* Permission Matrix */}
      <div className="rounded-lg border border-border bg-card">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Nhóm quyền hạn</h2>
            {dirty && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                {toAdd.length + toRemove.length} thay đổi
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dirty && (!role.isSystem || isPlatformAdmin) && (
              <>
                <button
                  onClick={() => setLocalChecked(new Set(role.permissions.map((p) => p.id)))}
                  className="rounded-md border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                >
                  Hoàn tác
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm quyền theo tên hoặc key..."
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {saveError && (
          <div className="border-b border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
            {saveError}
          </div>
        )}

        {/* Module groups */}
        <div className="divide-y divide-border">
          {permsLoading || !localChecked ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : filteredModules.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {permSearch ? 'Không tìm thấy quyền phù hợp.' : 'Chưa có quyền nào.'}
            </p>
          ) : (
            filteredModules.map((m) => {
              const isCollapsed = collapsedModules.has(m.moduleKey);
              const allChecked = m.permissions.every((p) => localChecked.has(p.id));
              const someChecked = !allChecked && m.permissions.some((p) => localChecked.has(p.id));
              const moduleLabel = MODULE_LABEL[m.moduleKey] ?? m.moduleKey;
              const checkedInModule = m.permissions.filter((p) => localChecked.has(p.id)).length;

              return (
                <div key={m.moduleKey}>
                  {/* Module header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
                    {(!role.isSystem || isPlatformAdmin) && (
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked; }}
                        onChange={() => toggleModule(m.moduleKey, m.permissions)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleCollapse(m.moduleKey)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        {moduleLabel}
                      </span>
                      <code className="text-[10px] text-muted-foreground">{m.moduleKey}</code>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {checkedInModule}/{m.permissions.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Permissions grid */}
                  {!isCollapsed && (
                    <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
                      {m.permissions.map((p) => {
                        const checked = localChecked.has(p.id);
                        const wasAssigned = assignedIds.has(p.id);
                        const changed = checked !== wasAssigned;

                        return (
                          <label
                            key={p.id}
                            onMouseEnter={(e) => setHoveredPerm({ perm: p, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                            onMouseLeave={() => setHoveredPerm(null)}
                            className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30 ${
                              changed ? 'bg-amber-500/5' : ''
                            } ${role.isSystem && !isPlatformAdmin ? 'cursor-default' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={role.isSystem && !isPlatformAdmin}
                              onChange={() => togglePerm(p.id)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer disabled:cursor-default"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-medium leading-tight ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {p.permissionName}
                              </p>
                            </div>
                            {changed && (
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                checked ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'
                              }`}>
                                {checked ? '+' : '−'}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom save bar */}
        {dirty && (!role.isSystem || isPlatformAdmin) && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-700 font-medium">+{toAdd.length}</span> thêm ·{' '}
              <span className="text-red-700 font-medium">−{toRemove.length}</span> bỏ
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setLocalChecked(new Set(role.permissions.map((p) => p.id)))}
                className="rounded-md border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
              >
                Hoàn tác
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assigned accounts */}
      {role.accounts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Tài khoản được gán ({role.accounts.length})
            </h2>
          </div>
          <div className="space-y-2">
            {role.accounts.map((acct) => (
              <div key={acct.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {acct.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{acct.fullName}</p>
                  <p className="text-xs text-muted-foreground">{acct.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  acct.scopeType === 'platform'
                    ? 'bg-violet-500/10 text-violet-700'
                    : acct.scopeType === 'business'
                    ? 'bg-sky-500/10 text-sky-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {SCOPE_TYPE_LABEL[acct.scopeType] ?? acct.scopeType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Sửa vai trò</h3>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Tên vai trò *</label>
                <input
                  className={INPUT}
                  value={editForm.roleName}
                  onChange={(e) => setEditForm((f) => ({ ...f, roleName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Mô tả</label>
                <textarea
                  className={INPUT}
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            {updateMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                  {getApiErrorMessage(updateMut.error, 'Không thể cập nhật vai trò.')}
                </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditOpen(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">
                Hủy
              </button>
              <button
                onClick={() =>
                  updateMut.mutate(
                    { roleName: editForm.roleName, description: editForm.description },
                    { onSuccess: () => setEditOpen(false) }
                  )
                }
                disabled={updateMut.isPending || !editForm.roleName}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {updateMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">Xóa vai trò?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Vai trò <strong>{role.roleName}</strong> sẽ bị xóa vĩnh viễn, bao gồm tất cả các quyền và gán tài khoản liên quan. Hành động này không thể hoàn tác.
            </p>
            {deleteMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {getApiErrorMessage(deleteMut.error, 'Không thể xóa vai trò.')}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">
                Hủy
              </button>
              <button
                onClick={() => deleteMut.mutate(undefined, undefined)}
                disabled={deleteMut.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-60 transition"
              >
                {deleteMut.isPending ? 'Đang xóa...' : 'Xóa vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission tooltip — fixed, appears above hovered item */}
      {hoveredPerm && (
        <div
          className="pointer-events-none fixed z-[200] w-[340px] overflow-hidden rounded-lg border border-border bg-white shadow-xl dark:bg-zinc-900"
          style={{
            bottom: window.innerHeight - hoveredPerm.rect.top + 10,
            left: Math.min(hoveredPerm.rect.left, window.innerWidth - 356),
          }}
        >
          <div className="border-b border-border/60 bg-muted/40 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {MODULE_LABEL[hoveredPerm.perm.moduleKey.toUpperCase()] ?? hoveredPerm.perm.moduleKey}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{hoveredPerm.perm.permissionName}</p>
            <code className="mt-1 block text-[11px] text-primary">{hoveredPerm.perm.permissionKey}</code>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {PERM_DESC[hoveredPerm.perm.permissionKey] ?? 'Không có mô tả chi tiết cho quyền này.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
