package com.kong.oc.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

public class MailService {

//    private static final String SEND_GRID_API_KEY = "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";
//
//    private final MailSettings mailSetting;
//
//    private final JavaMailSender mailSender;
//
//    public void sendSimpleMail(final String to, final String subject, final String content) {
//
//        Email from = new Email("luissalzar48@gmail.com");
//        Email toEmail = new Email(to);
//        Content emailContent = new Content("text/plain", content);
//        Mail mail = new Mail(from, subject, toEmail, emailContent);
//
//        SendGrid sg = new SendGrid(SEND_GRID_API_KEY);
//        Request request = new Request();
//
//        request.setMethod(Method.POST);
//        //request.setBody(mail.build());
//        request.setEndpoint("mail/send");
//        //Response res = sg.api(request);
//        //log.info("sendSimpleMail to: {}, status: {}", to, res.getStatusCode());
//    }
//
//
//    public void sendHttpMail(final String to, final String subject,
//                             final String content) throws MessagingException {
//
//        final MimeMessage message = this.mailSender.createMimeMessage();
//        final MimeMessageHelper messageHelper = new MimeMessageHelper(message, true);
//
//        //messageHelper.setFrom(this.mailSetting.getUsername());
//        messageHelper.setTo(to);
//
//        messageHelper.setSubject(subject);
//        messageHelper.setText(content, true);
//        this.mailSender.send(message);
//        log.info("sendHtmlMail to: {}", to);
//    }
}
