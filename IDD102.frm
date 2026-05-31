VERSION 5.00
Begin VB.Form IDD102 
   Caption         =   "Demo"
   ClientHeight    =   10050
   ClientLeft      =   60
   ClientTop       =   450
   ClientWidth     =   9000
   BeginProperty Font 
      Name            =   "宋体"
      Size            =   12
      Charset         =   134
      Weight          =   400
      Underline       =   0   'False
      Italic          =   0   'False
      Strikethrough   =   0   'False
   EndProperty
   Icon            =   "IDD102.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   10050
   ScaleWidth      =   9000
   StartUpPosition =   3  '窗口缺省
   Begin VB.CheckBox IDD102_1017 
      Caption         =   "检查入住时间(用于预订)"
      Height          =   495
      Left            =   5640
      TabIndex        =   20
      Top             =   1320
      Width           =   3015
   End
   Begin VB.CheckBox IDD102_1018 
      Caption         =   "允许开反锁"
      Height          =   495
      Left            =   3000
      TabIndex        =   19
      Top             =   1320
      Width           =   1935
   End
   Begin VB.CheckBox IDD102_1016 
      Caption         =   "新卡顶替旧卡"
      Height          =   495
      Left            =   720
      TabIndex        =   18
      Top             =   1320
      Width           =   1935
   End
   Begin VB.CommandButton IDD102_1011 
      Caption         =   "入住时间"
      Height          =   495
      Left            =   720
      TabIndex        =   16
      Top             =   4200
      Width           =   1215
   End
   Begin VB.CommandButton IDD102_1009 
      Caption         =   "读    卡"
      Enabled         =   0   'False
      Height          =   615
      Left            =   6120
      TabIndex        =   10
      Top             =   5760
      Width           =   1815
   End
   Begin VB.CommandButton IDD102_1005 
      Caption         =   "销   卡"
      Enabled         =   0   'False
      Height          =   615
      Left            =   3600
      TabIndex        =   9
      Top             =   5760
      Width           =   1815
   End
   Begin VB.CommandButton IDD102_1003 
      Caption         =   "入    住"
      Enabled         =   0   'False
      Height          =   615
      Left            =   1080
      TabIndex        =   8
      Top             =   5760
      Width           =   1815
   End
   Begin VB.TextBox txtOutTime 
      Height          =   600
      Left            =   2160
      TabIndex        =   7
      Top             =   4920
      Width           =   6255
   End
   Begin VB.TextBox txtInTime 
      Height          =   600
      Left            =   2160
      TabIndex        =   5
      Top             =   4200
      Width           =   6255
   End
   Begin VB.TextBox txtRoomNo 
      Height          =   600
      Left            =   2160
      TabIndex        =   4
      Text            =   "001.002.028"
      Top             =   3480
      Width           =   6255
   End
   Begin VB.CommandButton IDD102_1002 
      Caption         =   "配置SDK"
      Height          =   495
      Left            =   6600
      TabIndex        =   2
      Top             =   360
      Width           =   1815
   End
   Begin VB.OptionButton IDD102_1001 
      Caption         =   "5-RF50卡"
      Height          =   375
      Left            =   4080
      TabIndex        =   1
      Top             =   360
      Value           =   -1  'True
      Width           =   2415
   End
   Begin VB.OptionButton IDD102_1000 
      Caption         =   "4-T57卡"
      Height          =   375
      Left            =   960
      TabIndex        =   0
      Top             =   360
      Width           =   2295
   End
   Begin VB.Label IDD_TEX1 
      Height          =   855
      Left            =   0
      TabIndex        =   22
      Top             =   6600
      Width           =   9015
   End
   Begin VB.Label IDD_TEXT 
      Height          =   2655
      Left            =   120
      TabIndex        =   21
      Top             =   7440
      Width           =   8655
   End
   Begin VB.Label IDD102_1012 
      AutoSize        =   -1  'True
      Caption         =   "Please enter the Lock Number here, not the Room Number! (Please refer to the help documents)"
      Height          =   600
      Left            =   720
      TabIndex        =   17
      Top             =   2520
      Width           =   7800
      WordWrap        =   -1  'True
   End
   Begin VB.Label lblMsg3 
      AutoSize        =   -1  'True
      Height          =   360
      Left            =   5880
      TabIndex        =   15
      Top             =   6600
      Width           =   120
   End
   Begin VB.Label lblMsg2 
      AutoSize        =   -1  'True
      Height          =   360
      Left            =   5880
      TabIndex        =   14
      Top             =   6240
      Width           =   120
   End
   Begin VB.Label lblMsg1 
      AutoSize        =   -1  'True
      Height          =   360
      Left            =   5880
      TabIndex        =   13
      Top             =   5880
      Width           =   120
   End
   Begin VB.Label lblMsg 
      AutoSize        =   -1  'True
      Height          =   360
      Left            =   5880
      TabIndex        =   12
      Top             =   5520
      Width           =   120
   End
   Begin VB.Label lblCardNO 
      AutoSize        =   -1  'True
      Height          =   360
      Left            =   960
      TabIndex        =   11
      Top             =   6240
      Width           =   120
   End
   Begin VB.Label IDD102_1014 
      AutoSize        =   -1  'True
      Caption         =   "预离时间"
      Height          =   360
      Left            =   720
      TabIndex        =   6
      Top             =   4920
      Width           =   960
   End
   Begin VB.Label IDD102_1013 
      AutoSize        =   -1  'True
      Caption         =   "门锁号"
      Height          =   360
      Left            =   720
      TabIndex        =   3
      Top             =   3480
      Width           =   720
   End
End
Attribute VB_Name = "IDD102"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Dim iLockType As Integer '门锁类型
Dim iret As Integer '返回值
Dim sRoomNo As String '房号
Dim sInTime As String '入住时间
Dim sOutTime As String '预离时间
Dim sCardNo As String '卡号
Dim strMsg As String
Dim iFlags As Integer '入住时各种标志的设定20151105
 

 

 

Private Sub IDD102_1002_Click()
'配置动态库，连接发卡器
'在动态库中用Int类型,在这里用Integer类型
    If IDD102_1000.Value = True Then
        iLockType = 4
    Else
        If IDD102_1001.Value = True Then
            iLockType = 5
        End If
    End If
    
    
    iret = TP_Configuration(iLockType)
    
        CheckErr (iret)
  If iret = 1 Then
        Me.IDD102_1003.Enabled = True
        Me.IDD102_1005.Enabled = True
        Me.IDD102_1009.Enabled = True
        Me.IDD102_1011.Enabled = True
    End If
End Sub

Private Sub IDD102_1003_Click()
    '入住
    '在动态库里输入，输出char*型，在这里用string型 ，但需要用space分配空间
    iFlags = 0
    sRoomNo = Space(100)
    sInTime = Space(100)
    sOutTime = Space(100)
    sCardNo = Space(100)
    
    lblMsg.Caption = ""
    lblMsg1.Caption = ""
    lblMsg2.Caption = ""
    lblMsg3.Caption = ""
    
    sRoomNo = Me.txtRoomNo.Text
    sInTime = Me.txtInTime.Text
    sOutTime = Me.txtOutTime.Text
    
    '卡的各种标志20151105
    If IDD102_1018.Value = 1 Then '允许开反锁
        iFlags = iFlags + 1
    End If
    
    If IDD102_1016.Value = 0 Then '新卡顶替旧卡  默认顶替，如果不顶替，则+8
        iFlags = iFlags + 8
    End If
       
    If IDD102_1017.Value = 1 Then '检查入住时间(用于预订)  默认不检测入住时间
        iFlags = iFlags + 128
    End If
    
   
    
    
    
    iret = TP_MakeGuestCardEx(sCardNo, sRoomNo, sInTime, sOutTime, iFlags)
     
    CheckErr (iret)
End Sub

Private Sub IDD102_1005_Click()
    '销卡（回收卡，结账，注销等)
     lblMsg.Caption = ""
    lblMsg1.Caption = ""
    lblMsg2.Caption = ""
    lblMsg3.Caption = ""
    sCardNo = Space(100)
    iret = TP_CancelCard(sCardNo)
     
    CheckErr (iret)
End Sub

 

Private Sub IDD102_1009_Click()
     sRoomNo = Space(20)
    sInTime = Space(100)
    sOutTime = Space(100)
    sCardNo = Space(100)
    
    Dim str As String
    Dim strtemp As String
   ' iret = TP_ReadGuestCard(sCardNo, sRoomNo, sInTime, sOutTime)
    iret = TP_ReadGuestCardEx(sCardNo, sRoomNo, sInTime, sOutTime, iFlags)
    If iret = 1 Then
        strtemp = Trim(sCardNo)
        strtemp = Left(strtemp, Len(strtemp) - 1)
        str = g_LoadString_Ex("IDS_STRING_CARDNO") & strtemp & vbCrLf
        strtemp = Trim(sRoomNo)
        
        strtemp = Trim(Left(strtemp, Len(strtemp) - 1))
        
        str = str & g_LoadString_Ex("IDS_STRING_LOCKNO") & strtemp & vbCrLf
        '20200326
        IDD_TEX1.Caption = str
        str = ""
        strtemp = Trim(sInTime)
        strtemp = Left(strtemp, Len(strtemp) - 1)
        str = str & g_LoadString_Ex("IDS_STRING_INTIME") & strtemp & vbCrLf
        strtemp = Trim(sOutTime)
        strtemp = Left(strtemp, Len(strtemp) - 1)
        str = str & g_LoadString_Ex("IDS_STRING_OUTTIME") & strtemp & vbCrLf
        
        str = str & g_LoadString_Ex("IDS_STRING_FLAGS") & vbCrLf
        If iFlags = 24 Then
            strtemp = "0x18"
            str = str & strtemp & vbCrLf
        Else
        
        End If
        
        
        
        If (iFlags And 1) <> 0 Then
            IDD102_1018.Value = 1
            strtemp = g_LoadString_Ex("IDS_CHK_OPEN_BLOCK")
            str = str & strtemp & vbCrLf
        Else
            IDD102_1018.Value = 0
        End If
        If (iFlags And 8) = 0 Then
            IDD102_1016.Value = 1
            strtemp = g_LoadString_Ex("IDS_CHK_REPLACE")
            str = str & strtemp & vbCrLf
        Else
            IDD102_1016.Value = 0
        End If
        
        If (iFlags And 128) <> 0 Then
            IDD102_1017.Value = 1
            strtemp = g_LoadString_Ex("IDS_CHK_CHECKIN_TIME")
            str = str & strtemp & vbCrLf
        Else
            IDD102_1017.Value = 0
        End If
        
        IDD_TEXT.Caption = str
        
        
     '  MsgBox str, vbInformation, g_LoadString_Ex("IDS_STRING_MSG")
      
    Else
        CheckErr (iret)
    End If
    
End Sub

Private Sub IDD102_1011_Click()
  txtInTime.Text = Format(Date, "yyyy-mm-dd") & " " & Format(Time, "hh:MM:ss")
End Sub

Private Sub Form_Load()
    Dim sHour As String
    Dim sMinute As String
    
    Me.IDD102_1000.Value = False
    Me.IDD102_1001.Value = True
   'txtInTime.Text = DateTime.Date + DateTime.Time
 txtInTime.Text = Format(Date, "yyyy-mm-dd") & " " & Format(Time, "hh:MM:ss")
    sMinute = " 12:00:00"
    
    txtOutTime.Text = Mid(txtInTime.Text, 1, 8) + CStr(DateTime.Day(DateTime.Date) + 1) + sMinute
    Call g_SetFormString_Ex(IDD102)
     
End Sub
 

Private Sub IDD102_1001_Click()
     iLockType = 5
    Me.IDD102_1000.Value = False
End Sub

Private Sub IDD102_1000_Click()
    iLockType = 4
    Me.IDD102_1001.Value = False
End Sub
