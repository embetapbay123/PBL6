# -*- coding: utf-8 -*-
import os
import zipfile
import xml.etree.ElementTree as ET
import win32com.client
import openpyxl.utils

def get_evaluated_values_via_com(file_path):
    print(f"Reading evaluated values via Excel COM: {file_path}...")
    abs_path = os.path.abspath(file_path)

    # Make a temporary copy so Excel COM never locks the target file!
    import shutil
    temp_com_copy = abs_path + '.com_copy.xlsx'
    shutil.copy2(abs_path, temp_com_copy)

    excel = win32com.client.DispatchEx('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False

    evaluated_by_sheet = {}
    try:
        wb = excel.Workbooks.Open(temp_com_copy)
        excel.CalculateFullRebuild()

        for sh in wb.Sheets:
            sh_name = sh.Name
            used_range = sh.UsedRange
            formulas = used_range.Formula
            values = used_range.Value
            row_offset = used_range.Row
            col_offset = used_range.Column

            cell_map = {}
            for r_idx, row in enumerate(formulas):
                for c_idx, cell_val in enumerate(row):
                    if isinstance(cell_val, str) and cell_val.startswith('='):
                        val = values[r_idx][c_idx]
                        r_num = row_offset + r_idx
                        c_num = col_offset + c_idx
                        col_letter = openpyxl.utils.get_column_letter(c_num)
                        cell_ref = f"{col_letter}{r_num}"
                        cell_map[cell_ref] = val
            evaluated_by_sheet[sh_name] = cell_map

        wb.Close(False)
        del wb
    finally:
        excel.Quit()
        del excel
        import gc
        gc.collect()
        import time
        time.sleep(0.5)
        try:
            if os.path.exists(temp_com_copy):
                os.remove(temp_com_copy)
        except:
            pass

    total_formulas = sum(len(v) for v in evaluated_by_sheet.values())
    print(f"Extracted {total_formulas} evaluated formula values from Excel COM.")
    return evaluated_by_sheet

def inject_cached_values_into_xlsx(file_path):
    abs_path = os.path.abspath(file_path)
    evaluated_by_sheet = get_evaluated_values_via_com(abs_path)

    # Read sheet mapping from workbook.xml
    with zipfile.ZipFile(abs_path, 'r') as zin:
        wb_xml = zin.read('xl/workbook.xml')
        wb_rels = zin.read('xl/_rels/workbook.xml.rels')

    root_wb = ET.fromstring(wb_xml)
    ns_main = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    root_rels = ET.fromstring(wb_rels)
    ns_rels = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    rel_id_to_target = {}
    for rel in root_rels.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        rel_id = rel.get('Id')
        target = rel.get('Target')
        rel_id_to_target[rel_id] = target

    # Map sheet name to worksheet file path in ZIP
    sheet_name_to_xml = {}
    for sheet_tag in root_wb.findall('.//ns:sheet', ns_main):
        name = sheet_tag.get('name')
        r_id = sheet_tag.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        target_path = rel_id_to_target.get(r_id)
        if target_path:
            # normalize relative path inside ZIP
            if target_path.startswith('/'):
                zip_target = target_path.lstrip('/')
            elif target_path.startswith('xl/'):
                zip_target = target_path
            else:
                zip_target = 'xl/' + target_path
            sheet_name_to_xml[name] = zip_target

    print(f"Sheet XML mapping: {sheet_name_to_xml}")

    # Now rewrite the zip with injected <v> values
    temp_zip_path = abs_path + '.tmp'
    total_injected = 0
    with zipfile.ZipFile(abs_path, 'r') as zin, zipfile.ZipFile(temp_zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            # Find if this file is a worksheet with formulas
            matching_sheet = next((sname for sname, xpath in sheet_name_to_xml.items() if xpath == item.filename), None)
            if matching_sheet and matching_sheet in evaluated_by_sheet:
                cell_vals = evaluated_by_sheet[matching_sheet]
                if cell_vals:
                    # Register namespace to preserve default namespace prefixing
                    ET.register_namespace('', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
                    ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')

                    sheet_root = ET.fromstring(content)
                    for c_elem in sheet_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                        f_elem = c_elem.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}f')
                        if f_elem is not None:
                            r_ref = c_elem.get('r')
                            if r_ref in cell_vals:
                                val = cell_vals[r_ref]
                                v_elem = c_elem.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                                if v_elem is None:
                                    v_elem = ET.SubElement(c_elem, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')

                                if val is None:
                                    v_elem.text = ""
                                elif isinstance(val, (int, float)):
                                    if isinstance(val, float) and val.is_integer():
                                        v_elem.text = str(int(val))
                                    else:
                                        v_elem.text = f"{val:.4f}".rstrip('0').rstrip('.') if isinstance(val, float) else str(val)
                                    # Ensure type is not str
                                    if 't' in c_elem.attrib:
                                        del c_elem.attrib['t']
                                else:
                                    # String value
                                    c_elem.set('t', 'str')
                                    v_elem.text = str(val)

                                total_injected += 1

                    content = ET.tostring(sheet_root, encoding='utf-8', xml_declaration=True)
            zout.writestr(item, content)

    # Replace original file with updated zip (retry on Windows file lock)
    import time
    time.sleep(0.5)
    for attempt in range(5):
        try:
            if os.path.exists(abs_path):
                os.remove(abs_path)
            os.rename(temp_zip_path, abs_path)
            break
        except Exception as e:
            time.sleep(1.0)
            if attempt == 4:
                raise e
    print(f"Successfully injected cached values into {total_injected} formulas in: {file_path}")

if __name__ == '__main__':
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        inject_cached_values_into_xlsx(t)
