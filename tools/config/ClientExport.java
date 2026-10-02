import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.apache.poi.ss.usermodel.*;

/** 复用原导表工具 JAR 内的 Excel 解析库和五行规范，只输出客户端 CSV。 */
public class ClientExport {
  static String cell(Row row, int col, FormulaEvaluator evaluator) {
    if(row==null || row.getCell(col)==null) return "";
    Cell c=row.getCell(col); CellType type=c.getCellType();
    if(type==CellType.FORMULA) {
      CellValue value=evaluator.evaluate(c);
      if(value.getCellType()==CellType.ERROR)throw new IllegalArgumentException("Formula error: "+c.getAddress());
      if(value.getCellType()==CellType.NUMERIC)return new java.math.BigDecimal(Double.toString(value.getNumberValue())).stripTrailingZeros().toPlainString();
      if(value.getCellType()==CellType.STRING)return value.getStringValue();
      return value.getCellType()==CellType.BOOLEAN?(value.getBooleanValue()?"1":"0"):"";
    }
    if(type==CellType.NUMERIC)return new java.math.BigDecimal(Double.toString(c.getNumericCellValue())).stripTrailingZeros().toPlainString();
    if(type==CellType.STRING)return c.getStringCellValue();
    if(type==CellType.BLANK)return "";
    if(type==CellType.BOOLEAN)return c.getBooleanCellValue()?"1":"0";
    throw new IllegalArgumentException("Unsupported cell: "+c.getAddress());
  }
  static String csv(String value) { return value.contains(",")||value.contains("\"")||value.contains("\r")||value.contains("\n")?"\""+value.replace("\"","\"\"")+"\"":value; }
  public static void main(String[] args) throws Exception {
    if(args.length!=2)throw new IllegalArgumentException("ClientExport <xlsx-folder> <staging-folder>");
    Path input=Path.of(args[0]),output=Path.of(args[1]);Files.createDirectories(output);
    try(var paths=Files.list(input)) {
      for(Path file:paths.filter(p->p.toString().endsWith(".xlsx")&&!p.getFileName().toString().startsWith("~")).sorted().toList()) {
        try(Workbook book=WorkbookFactory.create(file.toFile(),null,true)) {
          if(book.getNumberOfSheets()!=1)throw new IllegalArgumentException(file+": expected one config sheet");
          Sheet sheet=book.getSheetAt(0);FormulaEvaluator eval=book.getCreationHelper().createFormulaEvaluator();
          if(sheet.getRow(4)==null)throw new IllegalArgumentException(file+": missing five-row header");
          int columns=sheet.getRow(4).getLastCellNum();List<String> keys=new ArrayList<>(),types=new ArrayList<>();Set<String> unique=new HashSet<>();
          // Excel清空末列后可能保留空单元格记录；只忽略整列为空的尾列，内部空表头仍报错。
          while(columns>0 && cell(sheet.getRow(4),columns-1,eval).isEmpty()) {
            boolean empty=true;for(int r=0;r<=sheet.getLastRowNum();r++)if(!cell(sheet.getRow(r),columns-1,eval).isEmpty()){empty=false;break;}
            if(!empty)break;columns--;
          }
          if(columns==0)throw new IllegalArgumentException(file+": empty header");
          for(int c=0;c<columns;c++){
            String key=cell(sheet.getRow(4),c,eval),type=cell(sheet.getRow(2),c,eval);
            if(key.isEmpty()||!unique.add(key))throw new IllegalArgumentException(file+": empty/duplicate field "+key);
            if(!cell(sheet.getRow(1),c,eval).equals("client"))throw new IllegalArgumentException(file+": client fields only");
            if(!List.of("int","float","string").contains(type))throw new IllegalArgumentException(file+": unsupported type "+type);
            keys.add(key);types.add(type);
          }
          if(!keys.get(0).equals("id"))throw new IllegalArgumentException(file+": first field must be id");
          StringBuilder result=new StringBuilder(String.join(",",keys)+"\n");Set<String> ids=new HashSet<>();
          for(int r=5;r<=sheet.getLastRowNum();r++){
            List<String> values=new ArrayList<>();for(int c=0;c<columns;c++)values.add(cell(sheet.getRow(r),c,eval));
            if(values.stream().allMatch(String::isEmpty))continue;
            if(!values.get(0).matches("[1-9][0-9]*")||!ids.add(values.get(0)))throw new IllegalArgumentException(file+":"+(r+1)+": invalid/duplicate id");
            for(int c=0;c<columns;c++){String value=values.get(c),type=types.get(c);if(!type.equals("string")){
              try{double n=Double.parseDouble(value);if(!Double.isFinite(n)||type.equals("int")&&n!=Math.floor(n))throw new NumberFormatException();}
              catch(NumberFormatException e){throw new IllegalArgumentException(file+":"+(r+1)+":"+keys.get(c)+": invalid "+type+" = "+value);}
            }}
            result.append(String.join(",",values.stream().map(ClientExport::csv).toList())).append('\n');
          }
          Files.writeString(output.resolve(file.getFileName().toString().replace(".xlsx",".csv")),result,StandardCharsets.UTF_8);
          System.out.println(file.getFileName()+": "+ids.size()+" rows");
        }
      }
    }
  }
}
