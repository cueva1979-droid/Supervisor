import os
import sys
from typing import List
import flet as ft
from extractor_oc.parser import PDFExtractor, OrdenCompra, ItemOC
from extractor_oc.excel_export import exportar_orden, exportar_multiples


def get_export_dir():
    if getattr(sys, "frozen", False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    export_dir = os.path.join(base, "exports")
    os.makedirs(export_dir, exist_ok=True)
    return export_dir


EXPORT_DIR = get_export_dir()


class AppTheme:
    PRIMARY = "#1F4E79"
    ACCENT = "#2E75B6"
    SUCCESS = "#27AE60"
    ERROR = "#E74C3C"
    BG = "#F5F7FA"
    CARD_BG = "#FFFFFF"
    TEXT_DARK = "#2C3E50"
    TEXT_MUTED = "#7F8C8D"
    BORDER = "#E0E0E0"


def main(page: ft.Page):
    page.title = "Extractor OC - Catálogo Electrónico SERCOP"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 20
    page.bgcolor = AppTheme.BG
    page.scroll = ft.ScrollMode.AUTO
    page.window.width = 1200
    page.window.height = 800

    page.theme = ft.Theme(
        color_scheme=ft.ColorScheme(
            primary=AppTheme.PRIMARY,
            secondary=AppTheme.ACCENT,
        ),
    )

    ordenes: List[OrdenCompra] = []
    current_oc: OrdenCompra = None

    header = ft.Container(
        content=ft.Row(
            [
                ft.Icon(ft.icons.DESCRIPTION, size=32, color=AppTheme.PRIMARY),
                ft.Column(
                    [
                        ft.Text("Extractor de Órdenes de Compra", size=22, weight=ft.FontWeight.BOLD, color=AppTheme.PRIMARY),
                        ft.Text("Catálogo Electrónico - SERCOP Ecuador", size=12, color=AppTheme.TEXT_MUTED),
                    ],
                    spacing=0,
                ),
                ft.Container(expand=True),
                ft.Text("v1.0.0", size=11, color=AppTheme.TEXT_MUTED),
            ],
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        ),
        padding=15,
        bgcolor=AppTheme.CARD_BG,
        border_radius=10,
        shadow=ft.BoxShadow(blur_radius=4, color="rgba(0,0,0,0.08)"),
        margin=ft.margin.only(bottom=15),
    )

    file_list_tile = ft.Container(
        content=ft.Column([]),
        padding=10,
        bgcolor=AppTheme.CARD_BG,
        border_radius=8,
        expand=True,
    )

    status_bar = ft.Text("Listo. Seleccione uno o más archivos PDF para procesar.", size=12, color=AppTheme.TEXT_MUTED)

    info_fields = {}
    labels = [
        ("Orden de Compra:", "orden_compra"),
        ("Fecha de Aceptación:", "fecha_aceptacion"),
        ("Nombre Comercial:", "nombre_comercial"),
        ("RUC:", "ruc"),
        ("Administrador:", "administrador"),
    ]
    info_rows = []
    for label, key in labels:
        field = ft.Text("—", size=13, color=AppTheme.TEXT_DARK, selectable=True)
        info_fields[key] = field
        info_rows.append(
            ft.Row(
                [
                    ft.Container(
                        content=ft.Text(label, size=12, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED),
                        width=160,
                    ),
                    ft.Container(content=field, expand=True),
                ],
                spacing=5,
            )
        )

    objeto_field = ft.Text("—", size=13, color=AppTheme.TEXT_DARK, selectable=True)
    info_rows.append(
        ft.Row(
            [
                ft.Container(
                    content=ft.Text("Objeto:", size=12, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED),
                    width=160,
                ),
                ft.Container(content=objeto_field, expand=True),
            ],
            spacing=5,
        )
    )

    info_card = ft.Container(
        content=ft.Column(info_rows, spacing=8),
        padding=15,
        bgcolor=AppTheme.CARD_BG,
        border_radius=8,
        shadow=ft.BoxShadow(blur_radius=2, color="rgba(0,0,0,0.05)"),
        margin=ft.margin.only(top=10),
        visible=False,
    )

    items_table = ft.DataTable(
        columns=[
            ft.DataColumn(ft.Text("CPC", size=11, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED)),
            ft.DataColumn(ft.Text("Descripción", size=11, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED)),
            ft.DataColumn(ft.Text("Unidad", size=11, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED), numeric=True),
            ft.DataColumn(ft.Text("Cantidad", size=11, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED), numeric=True),
            ft.DataColumn(ft.Text("V. Unitario", size=11, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED), numeric=True),
            ft.DataColumn(ft.Text("Subtotal", size=11, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_MUTED), numeric=True),
        ],
        rows=[],
        border=ft.border.all(1, AppTheme.BORDER),
        heading_row_color=ft.colors.BLUE_GREY_50,
        data_row_color={"hovered": ft.colors.BLUE_GREY_50},
        column_spacing=20,
        horizontal_margin=10,
    )

    total_field = ft.Text("$0.00", size=18, weight=ft.FontWeight.BOLD, color=AppTheme.PRIMARY)
    items_card = ft.Container(
        content=ft.Column(
            [
                ft.Row(
                    [
                        ft.Text("Ítems de la Orden", size=14, weight=ft.FontWeight.BOLD, color=AppTheme.TEXT_DARK),
                        ft.Container(expand=True),
                        ft.Text("V. Total:", size=13, color=AppTheme.TEXT_MUTED),
                        total_field,
                    ],
                    vertical_alignment=ft.CrossAxisAlignment.CENTER,
                ),
                ft.Divider(height=1, color=AppTheme.BORDER),
                ft.Container(
                    content=ft.Column(
                        [items_table],
                        scroll=ft.ScrollMode.AUTO,
                        height=300,
                    ),
                ),
            ],
            spacing=10,
        ),
        padding=15,
        bgcolor=AppTheme.CARD_BG,
        border_radius=8,
        shadow=ft.BoxShadow(blur_radius=2, color="rgba(0,0,0,0.05)"),
        margin=ft.margin.only(top=10),
        visible=False,
    )

    progress_bar = ft.ProgressBar(width=400, visible=False, color=AppTheme.ACCENT)

    file_picker = ft.FilePicker(on_result=lambda e: _on_files_selected(e))
    page.overlay.append(file_picker)

    nav_buttons = ft.Row(spacing=8, wrap=True)
    nav_container = ft.Container(
        content=nav_buttons,
        margin=ft.margin.only(top=5),
        visible=False,
    )

    def _show_orden(oc: OrdenCompra):
        nonlocal current_oc
        current_oc = oc
        info_fields["orden_compra"].value = oc.orden_compra or "—"
        info_fields["fecha_aceptacion"].value = oc.fecha_aceptacion or "—"
        info_fields["nombre_comercial"].value = oc.nombre_comercial or "—"
        info_fields["ruc"].value = oc.ruc or "—"
        info_fields["administrador"].value = oc.administrador or "—"
        objeto_field.value = oc.objeto_contratacion or "—"
        info_card.visible = True

        items_table.rows.clear()
        for item in oc.items:
            items_table.rows.append(
                ft.DataRow(
                    cells=[
                        ft.DataCell(ft.Text(item.cpc or "—", size=12)),
                        ft.DataCell(ft.Text(item.descripcion or "—", size=12)),
                        ft.DataCell(ft.Text(item.unidad or "—", size=12)),
                        ft.DataCell(ft.Text(f"{item.cantidad:,.2f}", size=12)),
                        ft.DataCell(ft.Text(f"${item.v_unitario:,.2f}", size=12)),
                        ft.DataCell(ft.Text(f"${item.subtotal:,.2f}", size=12, weight=ft.FontWeight.BOLD)),
                    ],
                )
            )
        items_table.rows.append(
            ft.DataRow(
                cells=[
                    ft.DataCell(ft.Text("")),
                    ft.DataCell(ft.Text("")),
                    ft.DataCell(ft.Text("")),
                    ft.DataCell(ft.Text("")),
                    ft.DataCell(ft.Text("V. TOTAL", weight=ft.FontWeight.BOLD, color=AppTheme.PRIMARY, size=13)),
                    ft.DataCell(ft.Text(f"${oc.v_total:,.2f}", weight=ft.FontWeight.BOLD, color=AppTheme.PRIMARY, size=13)),
                ],
                color=ft.colors.BLUE_GREY_50,
            )
        )
        total_field.value = f"${oc.v_total:,.2f}"
        items_card.visible = True
        page.update()

    def _export_excel(e):
        if not ordenes:
            status_bar.value = "No hay datos para exportar."
            page.update()
            return
        try:
            if len(ordenes) == 1:
                filename = f"OC_{ordenes[0].orden_compra.replace('/', '-')}.xlsx"
            else:
                filename = f"OC_Multiples_{len(ordenes)}_ordenes.xlsx"
            filepath = os.path.join(EXPORT_DIR, filename)

            if len(ordenes) == 1:
                exportar_orden(ordenes[0], filepath)
            else:
                exportar_multiples(ordenes, filepath)

            status_bar.value = f"Exportado a: {filename}"
            status_bar.color = AppTheme.SUCCESS

            page.dialog = ft.AlertDialog(
                title=ft.Text("Exportación Exitosa"),
                content=ft.Text(f"Archivo guardado en:\n{filepath}"),
                actions=[ft.TextButton("Abrir carpeta", on_click=lambda _: os.startfile(EXPORT_DIR)),
                         ft.TextButton("Cerrar", on_click=lambda _: setattr(page.dialog, 'open', False) or page.update())],
            )
            page.dialog.open = True
        except Exception as ex:
            status_bar.value = f"Error al exportar: {str(ex)}"
            status_bar.color = AppTheme.ERROR
        page.update()

    def _clear_all(e):
        nonlocal current_oc, ordenes
        ordenes.clear()
        current_oc = None
        file_list_tile.content.controls.clear()
        info_card.visible = False
        items_card.visible = False
        nav_container.visible = False
        status_bar.value = "Listo. Seleccione uno o más archivos PDF para procesar."
        status_bar.color = AppTheme.TEXT_MUTED
        page.update()

    def _update_nav(selected_index: int):
        nav_buttons.controls.clear()
        for i, oc in enumerate(ordenes):
            label = oc.orden_compra or f"Orden {i+1}"
            btn = ft.ElevatedButton(
                text=label,
                size=11,
                on_click=lambda _, idx=i: _show_orden(ordenes[idx]),
                bgcolor=AppTheme.ACCENT if i == selected_index else AppTheme.CARD_BG,
                color=ft.colors.WHITE if i == selected_index else AppTheme.TEXT_DARK,
                style=ft.ButtonStyle(
                    shape=ft.RoundedRectangleBorder(radius=6),
                    padding=ft.padding.only(left=12, right=12, top=6, bottom=6),
                ),
            )
            nav_buttons.controls.append(btn)
        page.update()

    def _on_files_selected(e: ft.FilePickerResultEvent):
        if not e.files:
            return
        file_list_tile.content.controls.clear()
        ordenes.clear()
        progress_bar.visible = True
        status_bar.value = f"Procesando {len(e.files)} archivo(s)..."
        page.update()

        for f in e.files:
            row = ft.Row(
                [
                    ft.ProgressRing(width=14, height=14, stroke_width=2, color=AppTheme.ACCENT),
                    ft.Text(os.path.basename(f.path), size=12, color=AppTheme.TEXT_DARK),
                    ft.Container(expand=True),
                    ft.Text("Procesando...", size=11, color=AppTheme.TEXT_MUTED),
                ],
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            )
            file_list_tile.content.controls.append(row)
        page.update()

        for idx, f in enumerate(e.files):
            try:
                extractor = PDFExtractor(f.path)
                oc = extractor.extract()
                ordenes.append(oc)
                row = file_list_tile.content.controls[idx]
                row.controls[-1] = ft.Text("✓ Extraído", size=11, color=AppTheme.SUCCESS)
                row.controls[0] = ft.Icon(ft.icons.CHECK_CIRCLE, size=16, color=AppTheme.SUCCESS)
            except Exception as ex:
                row = file_list_tile.content.controls[idx]
                row.controls[-1] = ft.Text(f"Error: {str(ex)[:50]}", size=11, color=AppTheme.ERROR)
                row.controls[0] = ft.Icon(ft.icons.ERROR, size=16, color=AppTheme.ERROR)
            page.update()

        progress_bar.visible = False
        if ordenes:
            _show_orden(ordenes[0])
            nav_container.visible = True
            _update_nav(0)
            status_bar.value = f"{len(ordenes)} orden(es) procesada(s). Seleccione una para ver detalles."
        else:
            status_bar.value = "No se pudieron procesar los archivos."
        page.update()

    actions_bar = ft.Container(
        content=ft.Row(
            [
                ft.ElevatedButton(
                    "Seleccionar PDF(s)",
                    icon=ft.icons.UPLOAD_FILE,
                    bgcolor=AppTheme.PRIMARY,
                    color=ft.colors.WHITE,
                    on_click=lambda _: file_picker.pick_files(
                        allow_multiple=True,
                        file_type=ft.FilePickerFileType.CUSTOM,
                        allowed_extensions=["pdf"],
                    ),
                    style=ft.ButtonStyle(
                        shape=ft.RoundedRectangleBorder(radius=8),
                        padding=ft.padding.only(left=16, right=16, top=12, bottom=12),
                    ),
                ),
                ft.Container(width=10),
                ft.ElevatedButton(
                    "Exportar a Excel",
                    icon=ft.icons.INSERT_CHART,
                    bgcolor=AppTheme.SUCCESS,
                    color=ft.colors.WHITE,
                    on_click=_export_excel,
                    style=ft.ButtonStyle(
                        shape=ft.RoundedRectangleBorder(radius=8),
                        padding=ft.padding.only(left=16, right=16, top=12, bottom=12),
                    ),
                ),
                ft.Container(width=10),
                ft.OutlinedButton(
                    "Limpiar",
                    icon=ft.icons.DELETE_SWEEP,
                    on_click=_clear_all,
                    style=ft.ButtonStyle(
                        shape=ft.RoundedRectangleBorder(radius=8),
                        padding=ft.padding.only(left=16, right=16, top=12, bottom=12),
                    ),
                ),
                ft.Container(expand=True),
                progress_bar,
            ],
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        ),
        margin=ft.margin.only(bottom=10),
    )

    main_content = ft.Column(
        [
            header,
            actions_bar,
            file_list_tile,
            nav_container,
            info_card,
            items_card,
        ],
        spacing=0,
        expand=True,
    )

    page.add(main_content)

    page.add(
        ft.Container(
            content=status_bar,
            padding=ft.padding.only(top=5),
        )
    )


if __name__ == "__main__":
    ft.app(target=main)
