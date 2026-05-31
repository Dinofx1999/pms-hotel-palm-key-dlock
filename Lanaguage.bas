Attribute VB_Name = "Lanaguage"
Option Explicit
Public g_szCurPath As String
Public g_szLanguagePath As String
Public sLanguage As String

'取当前路径
Public Sub GetLanguagePath_Ex()
    g_szCurPath = App.Path
   ' sLanguage = GetIniStr(g_szCurPath + "\Config.ini", "System", "Language")
    g_szLanguagePath = g_szCurPath + "\ToolsLanguage.ini"
End Sub

'<summary>
'根据标识szID到选定的语言文件中加载字符串
'</summary>
'<param name="szID"></param>
'<returns></returns>
Public Function g_LoadString_Ex(ByVal szID As String) As String
    Dim szValue As String
    Dim iret As Integer
    
    If g_szLanguagePath = "" Then
        Call GetLanguagePath_Ex
    End If
    
    szValue = GetIniStr(g_szLanguagePath, "String", szID)
    g_LoadString_Ex = szValue
End Function

'<summary>
'当对话框运行时获取其所有可得到的字符串，并保存到语言文件中
'每个控件用对话框ID和控件ID唯一标识
'</summary>
'<param name="frm"></param>
Public Sub g_SetFormString_Ex(ByVal frm As Form)
    Dim szSection As String '窗口的名称
    Dim szKey As String '子控件的名称
    Dim szText As String '子控件的Caption
    Dim iret As Integer
    Dim bSetText As Boolean 'true 从文件中读，设置窗口；false:从对话框保存到文件
    Dim cl As Control
    
    szSection = frm.Name
    bSetText = True
    If g_szLanguagePath = "" Then
        Call GetLanguagePath_Ex
    End If
    
   ' iret = PF_SetIniPath_Ex(g_szLanguagePath)
    If bSetText Then '从文件中读到窗口控件中去
        '窗口标题
        szKey = szSection + "_Title"
        szText = GetIniStr(g_szLanguagePath, "LockSDKDemo", szKey)
        If szText = "" Then
            szText = "Not Found"
        End If
        frm.Caption = szText
        
        '各个子控件标题
        For Each cl In frm.Controls
            szKey = cl.Name ' szSection + "_" + cl.Name
            szText = GetIniStr(g_szLanguagePath, "LockSDKDemo", szKey)
            If szText <> "" Then
                cl.Caption = szText
            End If
        Next
    Else '从窗口保存到文件
        szKey = szSection + "_Title"
        szText = frm.Caption
        If WriteIniStr(g_szLanguagePath, "LockSDKDemo", szKey, szText) Then
            For Each cl In frm.Controls
                szKey = szSection + "_" + cl.Name
                szText = cl.Caption
              If WriteIniStr(g_szLanguagePath, "LockSDKDemo", szKey, szText) = False Then
                Exit For
              End If
            Next
        End If
    End If
    
    
End Sub


