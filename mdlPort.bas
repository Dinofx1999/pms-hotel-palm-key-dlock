Attribute VB_Name = "mdlPort"
Option Explicit
Public strRom As String
Public strRoomNo As String
Public strInTime As String
Public strOutTime As String

Public Declare Function TP_Configuration Lib "LockSDK.dll" (ByVal iLockType As Integer) As Integer '选择门锁类型
'/*=============================================================================
'函数名:                         TP_Configuration
'int __stdcall TP_Configuration(int lock_type);
'功 能: 动态库初始化配置 , 完成门锁类型选择 / 发卡器连接等
'输 入: lock_type --门锁类型(也就是使用的卡片类型)
'输 出: 无
'返回值: 错误类型
'=============================================================================*/

Public Declare Function TP_MakeGuestCardEx Lib "LockSDK.dll" (ByVal card_snr As String, ByVal Room_No As String, ByVal checkinTime As String, ByVal checkOutTime As String, ByVal iFlags As Integer) As Integer
'/*=============================================================================
'函数名:                         TP_MakeGuestCard
'int __stdcall TP_MakeGuestCard(char *card_snr, char *room_no, char *checkin_time,char *checkout_time, int iflags);
'功 能: 制作宾客卡
'输  入：room_no         --  房号:       字符串, 例如 "001.002.003.A"
 '       checkin_time    --  入住时间：  年月日时分秒, 字符串格式 "YYYY-MM-DD hh:mm:ss"
  '      checkout_time   --  预离时间：  年月日时分秒, 字符串格式 "YYYY-MM-DD hh:mm:ss"
   '     iFlags --宾客卡选项, 参见Defines中的GUEST_FLAGS定义, 一般置0
'输 出: card_snr --卡号:                 字符串 , 至少预分配20字节
'例  子: Room="001.002.003.A", SDateTime="2008-06-06 12:30:59", EDateTime="2008-06-07 12:00:00"
 '       iFlags = 0
'返回值: 错误类型
'=============================================================================*/


Public Declare Function TP_CancelCard Lib "LockSDK.dll" (ByVal card_snr As String) As Integer
'/*=============================================================================
'函数名:                         TP_CancelCard
'int __stdcall TP_CancelCard(char *card_snr);;
'功　能：注销卡片/卡片回收
'输 入: 无
'输 出:
'输 出: card_snr --卡号: 字符串 , 至少预分配20字节
'返回值: 错误类型
'=============================================================================*/


Public Declare Function TP_ReadGuestCard Lib "LockSDK.dll" (ByVal card_snr As String, ByVal Room_No As String, ByVal checkinTime As String, ByVal checkout_time As String) As Integer
'/*=============================================================================
'函数名:                         TP_ReadGuestCard
'int __stdcall   TP_ReadGuestCard(char *card_snr,char *room_no, char *checkin_time, char *checkout_time,int *iFlags));
'功 能: 读宾客卡信息
'输 入: 无?
'输 出: card_snr --卡号:                 字符串 , 至少预分配20字节
 '       room_no --房号:                 字符串 , 至少预分配20字节
  '      checkin_time    --  入住时间：  年月日时分秒, 字符串格式 "YYYY-MM-DD hh:mm:ss", 至少预分配30字节
   '     checkout_time   --  预离时间：  年月日时分秒, 字符串格式 "YYYY-MM-DD hh:mm:ss", 至少预分配30字节
   ' iFlags          --  卡片标志字节
'返回值: 错误类型
'=============================================================================*/

Public Declare Function TP_ReadGuestCardEx Lib "LockSDK.dll" (ByVal card_snr As String, ByVal Room_No As String, ByVal checkinTime As String, ByVal checkout_time As String, ByRef iFlags As Integer) As Integer
'/*=============================================================================
'函数名:                         TP_ReadGuestCardEx
'int __stdcall   TP_ReadGuestCardEx(char *card_snr,char *room_no, char *checkin_time, char *checkout_time);
'功 能: 读宾客卡信息
'输 入: 无?
'输 出: card_snr --卡号:                 字符串 , 至少预分配20字节
 '       room_no --房号:                 字符串 , 至少预分配20字节
  '      checkin_time    --  入住时间：  年月日时分秒, 字符串格式 "YYYY-MM-DD hh:mm:ss", 至少预分配30字节
   '     checkout_time   --  预离时间：  年月日时分秒, 字符串格式 "YYYY-MM-DD hh:mm:ss", 至少预分配30字节
'返回值: 错误类型
'=============================================================================*/


Private Declare Function GetPrivateProfileString Lib "kernel32" Alias "GetPrivateProfileStringA" (ByVal lpApplicationName As String, ByVal lpKeyName As Any, ByVal lpDefault As String, ByVal lpReturnedString As String, ByVal nSize As Long, ByVal pFileName As String) As Long
Private Declare Function WritePrivateProfileString Lib "kernel32" Alias "WritePrivateProfileStringA" (ByVal lpApplicationName As String, ByVal lpKeyName As Any, ByVal lpString As Any, ByVal lpFileName As String) As Long
 
'*************************************
   '目的:写入数据至Ini文件
    
   '输入: FileName 文件名
   '      AppName  项目名
   '      In_Key   键名
   '      In_Data  键名上的数值
    
   '返回:  写入成功 True
   '       写入失败 False
    
'*************************************
 
Public Function WriteIniStr(ByVal FileName As String, ByVal AppName As String, ByVal In_Key As String, ByVal In_Data As String) As Boolean
On Error GoTo WriteIniStrErr
WriteIniStr = True
If VBA.Trim(In_Data) = "" Or VBA.Trim(In_Key) = "" Or VBA.Trim(AppName) = "" Then
   GoTo WriteIniStrErr
Else
   WritePrivateProfileString AppName, In_Key, In_Data, FileName
End If
Exit Function
WriteIniStrErr:
   Err.Clear
   WriteIniStr = False
End Function
 
 
'*************************************
   '目的:从Ini文件中读取数据
    
   '输入: FileName 文件名
   '      AppName  项目名
   '      In_Key   键名
    
   '返回: 取得给定键名上的数据
    
'*************************************
 
Public Function GetIniStr(ByVal FileName As String, ByVal AppName As String, ByVal In_Key As String) As String
On Error GoTo GetIniStrErr
If VBA.Trim(In_Key) = "" Then
   GoTo GetIniStrErr
End If
Dim GetStr As String
  GetStr = VBA.String(128, 0)
  GetPrivateProfileString AppName, In_Key, "", GetStr, 256, FileName
  GetStr = VBA.Replace(GetStr, VBA.Chr(0), "")
If GetStr = "" Then
   GoTo GetIniStrErr
Else
   GetIniStr = GetStr
   GetStr = ""
End If
Exit Function
GetIniStrErr:
   Err.Clear
   GetIniStr = ""
   GetStr = ""
End Function

 

Function CheckErr(ByVal st As Integer)
        '------------------------------------------------------------
        ' 制作功能卡:CheckErr(返回号)
        '------------------------------------------------------------
    Select Case st
        Case 1
            MsgBox g_LoadString_Ex("IDS_STRING_SUCCESS"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
       Case -1
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR_NOCARD"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
       Case -2
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR_NOREADE"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
       Case -3
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR_INVALIDCARD"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
       Case -4
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR_CARDTYPE"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
       Case -5
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR_READCARD"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
       Case -8
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR_INPUT"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
       Case -29
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR_REG"), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
       Case Else
          MsgBox g_LoadString_Ex("IDS_STRING_ERROR") + g_LoadString_Ex("IDS_STRING_ERROR_CODE") + CStr(st), vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
          Exit Function
   End Select
End Function
